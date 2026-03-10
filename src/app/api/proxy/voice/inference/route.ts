import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { proxyRequest } from '@/lib/api/proxy-handler';
import { getPersonaSystemPrompt, type VoiceOption, type PersonaOption } from '@/store/voice-settings';

const VOICE_LANGUAGE = process.env.VOICE_LANGUAGE || 'en';

function getOpenAIClient(request?: NextRequest): OpenAI | null {
  const deploymentMode = request?.headers.get('X-Deployment-Mode') || 'production';
  let apiKey: string | undefined;
  
  if (deploymentMode === 'demo') {
    if (request) {
      apiKey = request.headers.get('X-OpenAI-API-Key') || undefined;
    }
    if (!apiKey) {
      return null;
    }
  } else {
    apiKey = process.env.OPENAI_API_KEY;
  }
  
  if (!apiKey) {
    return null;
  }
  
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const projectId = formData.get('projectId') as string;
    const sessionId = formData.get('sessionId') as string | null;
    const voice = (formData.get('voice') as VoiceOption) || 'alloy';
    const persona = (formData.get('persona') as PersonaOption) || 'assistant';
    const conversationHeader = request.headers.get('conversation') || '';
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'No projectId provided' }, { status: 400 });
    }

    const openai = getOpenAIClient(request);
    if (!openai) {
      const deploymentMode = request.headers.get('X-Deployment-Mode') || 'production';
      console.error('[VOICE-API] OpenAI API key not configured for mode:', deploymentMode);
      
      const errorMessage = deploymentMode === 'demo'
        ? 'Voice feature requires OpenAI API key. Please enable voice capability and provide your OpenAI API key in the demo setup.'
        : 'Voice feature requires OpenAI API key. Please add OPENAI_API_KEY to your .env.local file.';
      return NextResponse.json({ 
        error: errorMessage + ` (Mode: ${deploymentMode})`,
        userMessage: errorMessage,
        deploymentMode: deploymentMode
      }, { status: 503 });
    }

    const transcription = await transcribeAudio(audioFile, openai);

    const conversation = conversationHeader 
      ? JSON.parse(Buffer.from(conversationHeader, 'base64').toString('utf-8'))
      : [];
    
    const { response: aiResponse, sessionId: newSessionId } = await getCustomGPTCompletion(transcription, conversation, projectId, sessionId, persona, request);

    const audioBuffer = await textToSpeech(aiResponse, voice, openai);

    const newMessages = [
      { role: 'user', content: transcription },
      { role: 'assistant', content: aiResponse }
    ];
    
    const responseHeader = Buffer.from(JSON.stringify(newMessages)).toString('base64');

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'text': responseHeader,
        ...(newSessionId && { 'x-session-id': newSessionId }),
      },
    });

  } catch (error) {
    console.error('[VOICE-API] Voice inference error:', error);
    
    let errorMessage = 'Failed to process voice request';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to transcribe audio')) {
        errorMessage = 'Failed to transcribe audio. Check your OpenAI API key and ensure it has access to Whisper.';
      } else if (error.message.includes('Failed to get AI completion')) {
        errorMessage = 'Failed to get AI response. Check your CustomGPT API key configuration.';
      } else if (error.message.includes('Failed to convert text to speech')) {
        errorMessage = 'Failed to convert text to speech. Check your OpenAI API key and ensure it has access to TTS.';
      } else if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env.local file.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: statusCode }
    );
  }
}

async function transcribeAudio(audioFile: File, openai: OpenAI): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0,
    });
    
    return transcription.text;
  } catch (error: any) {
    console.error('[VOICE-API] Transcription error:', error);
    
    if (error?.error?.code === 'invalid_api_key' || error?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local');
    } else if (error?.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error?.status === 400) {
      throw new Error('Invalid audio format. Please ensure the audio is in WAV format.');
    } else if (error?.message?.includes('File is not defined')) {
      throw new Error('Server environment error. Unable to process audio file.');
    }
    
    throw new Error(`Failed to transcribe audio: ${error?.message || 'Unknown error'}`);
  }
}

async function getCustomGPTCompletion(userPrompt: string, conversation: any[], projectId: string, sessionId: string | null, persona: PersonaOption, voiceRequest: NextRequest): Promise<{ response: string; sessionId?: string }> {
  try {
    if (sessionId) {
      let enhancedPrompt = userPrompt;
      if (conversation.length === 0) {
        const personaPrompt = getPersonaSystemPrompt(persona);
        enhancedPrompt = `${personaPrompt}\n\nUser: ${userPrompt}`;
      }
      
      const requestBody = {
        prompt: enhancedPrompt,
        stream: false,
        source_ids: undefined
      };
      
      const mockRequest = new NextRequest(voiceRequest.url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const proxyResponse = await proxyRequest(
        `/projects/${projectId}/conversations/${sessionId}/messages`,
        mockRequest,
        { method: 'POST' }
      );
      
      if (!proxyResponse.ok) {
        return getCustomGPTCompletionFallback(userPrompt, conversation, projectId, persona, voiceRequest);
      }
      
      const data = await proxyResponse.json();
      
      let responseContent = '';
      if (data.data && data.data.openai_response) {
        responseContent = data.data.openai_response;
      } else if (data.data && data.data.user_query) {
        responseContent = data.data.openai_response || 'No response available';
      } else {
        responseContent = 'I couldn\'t understand the response format.';
      }
      
      return { response: responseContent, sessionId: sessionId };
      
    } else {
      return getCustomGPTCompletionFallback(userPrompt, conversation, projectId, persona, voiceRequest);
    }
  } catch (error) {
    console.error('[VOICE-API] CustomGPT proxy error:', error instanceof Error ? error.message : error);
    throw new Error(`CustomGPT API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getCustomGPTCompletionFallback(userPrompt: string, conversation: any[], projectId: string, persona: PersonaOption, voiceRequest: NextRequest): Promise<{ response: string; sessionId?: string }> {
  const messages = [
    { role: 'system', content: getPersonaSystemPrompt(persona) }
  ];
  
  conversation.forEach(msg => {
    messages.push({ role: msg.role, content: msg.content });
  });
  
  messages.push({ role: 'user', content: userPrompt });
  
  const requestBody: any = {
    messages: messages,
    stream: false,
    lang: 'en',
    is_inline_citation: false
  };
  
  const mockRequest = new NextRequest(voiceRequest.url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
  });
  
  const proxyResponse = await proxyRequest(
    `/projects/${projectId}/chat/completions`,
    mockRequest,
    { method: 'POST' }
  );
  
  if (!proxyResponse.ok) {
    const errorText = await proxyResponse.text();
    console.error('[VOICE-API] CustomGPT fallback error:', proxyResponse.status, errorText);
    
    if (proxyResponse.status === 403) {
      throw new Error('Agent is inactive - no documents uploaded');
    }
    
    throw new Error(`CustomGPT API error (${proxyResponse.status}): ${errorText}`);
  }
  
  const data = await proxyResponse.json();
  
  let responseContent = '';
  if (data.choices && data.choices[0] && data.choices[0].message) {
    responseContent = data.choices[0].message.content;
  } else if (data.data && data.data.openai_response) {
    responseContent = data.data.openai_response;
  } else if (data.response) {
    responseContent = data.response;
  } else if (data.answer) {
    responseContent = data.answer;
  } else {
    responseContent = 'I couldn\'t understand the response format.';
  }
  
  return { response: responseContent, sessionId: undefined };
}

async function textToSpeech(text: string, voice: VoiceOption, openai: OpenAI): Promise<Buffer> {
  return await openaiTextToSpeech(text, voice, openai);
}

async function openaiTextToSpeech(text: string, voice: VoiceOption, openai: OpenAI): Promise<Buffer> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
    });

    return Buffer.from(await mp3.arrayBuffer());
  } catch (error: any) {
    console.error('[VOICE-API] OpenAI TTS error:', error);
    
    if (error?.status === 401) {
      throw new Error('Invalid OpenAI API key for TTS. Please check your OPENAI_API_KEY in .env.local');
    } else if (error?.status === 429) {
      throw new Error('OpenAI TTS rate limit exceeded. Please try again later.');
    } else if (error?.status === 400) {
      throw new Error('Invalid text for TTS. Text may be too long or contain invalid characters.');
    }
    
    throw new Error(`Failed to convert text to speech: ${error?.message || 'Unknown error'}`);
  }
}
