/**
 * Types for ElevenLabs Conversational AI API (convai)
 * Used for Practice Floor voice agents.
 */

export interface ElevenLabsAgentConfig {
  agent_id?: string;
  name?: string;
  conversation_config?: {
    agent?: {
      first_message?: string;
      prompt?: {
        prompt?: string;
        temperature?: number;
        llm?: string;
      };
      language?: string;
    };
    tts?: {
      voice_id?: string;
      model_id?: string;
    };
    turn?: {
      turn_timeout?: number;
      turn_eagerness?: number;
      [key: string]: unknown;
    };
    conversation?: {
      max_duration_seconds?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ElevenLabsConversation {
  id?: string;
  agent_id?: string;
  caller?: { name?: string; [key: string]: unknown };
  duration_seconds?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export const VOICE_AGENT_IDS: { id: string; name: string; level: 'Beginner' | 'Intermediate' | 'Advanced' }[] = [
  { id: 'agent_8901kgmmeyptf96tyqky6fm6qy13', name: 'Zoe Chen', level: 'Beginner' },
  { id: 'agent_5201kgmpk85hekj9g3vsss6r7zcg', name: 'Maya Torres', level: 'Intermediate' },
  { id: 'agent_9101kgmprab4ewfaxnvw02ykbs6g', name: 'Vanessa Liu', level: 'Advanced' },
];
