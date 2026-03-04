export type TrendScopeType = 'global' | 'store';
export type CultureType = 'trend' | 'styling' | 'news';

export interface TrendSelections {
  topic: string;
  customQuery?: string;
  audience?: string;
  season?: string;
  region?: string;
  productFocus?: string;
  type?: CultureType;
  count?: number;
}

export interface GeneratedTrendCandidate {
  type: CultureType;
  category: string;
  title: string;
  description: string;
  engagementText: string;
  imagePrompt: string;
  imageUrl: string | null;
  trendQuery: string;
  selectionPayload: Record<string, unknown>;
}

export interface GeminiImageOptions {
  numberOfImages?: number;
  enableSearchGrounding?: boolean;
  upscale4k?: boolean;
  realWorldAccuracy?: boolean;
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
  imageSize?: '1K' | '2K' | '4K';
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

import { getAdminClient } from '@/lib/supabase';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TIMEOUT_MS = 50_000;
const STORAGE_BUCKET = 'culture-images';

async function uploadImageToStorage(base64Data: string, mimeType: string): Promise<string | null> {
  try {
    const supabase = getAdminClient();

    // Ensure the bucket exists with public access. Silently ignores "already exists" errors.
    await supabase.storage
      .createBucket(STORAGE_BUCKET, { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] })
      .catch(() => {});

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `trends/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      console.error('Storage upload failed:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('Storage upload error:', err);
    return null;
  }
}

function getPerplexityApiKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY must be set');
  return key;
}

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY must be set');
  return key;
}

function buildTrendPrompt(selections: TrendSelections) {
  const count = Math.max(1, Math.min(10, selections.count ?? 7));
  const type = selections.type ?? 'trend';
  const queryBase = selections.customQuery?.trim() || selections.topic;
  return `You are generating concise culture feed ideas for retail coaching at Coach.
Return JSON ONLY with this shape:
{"items":[{"category":"string","title":"string","description":"string","engagementText":"string","imagePrompt":"string"}]}

Rules:
- ${count} items exactly
- Items must be relevant to this search brief: ${queryBase}
- audience: ${selections.audience || 'all retail associates'}
- season: ${selections.season || 'current season'}
- region: ${selections.region || 'US'}
- product focus: ${selections.productFocus || 'general accessories'}
- Keep each title under 80 chars
- Keep each description under 220 chars
- engagementText should be short social-style text like "Trending now" or "Coach community pick"
- imagePrompt should describe a premium editorial lifestyle image for the trend
- type intent: ${type}`;
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

async function generateTrendTextFromPerplexity(selections: TrendSelections): Promise<GeneratedTrendCandidate[]> {
  const prompt = buildTrendPrompt(selections);
  const count = Math.max(1, Math.min(10, selections.count ?? 7));

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getPerplexityApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '';
  const direct = safeParseJson<{ items?: Array<Record<string, string>> }>(content);
  const fromSlice = safeParseJson<{ items?: Array<Record<string, string>> }>(
    extractJsonObject(content) || ''
  );
  const parsed = direct || fromSlice;

  const items = parsed?.items || [];
  if (!items.length) {
    throw new Error('Perplexity did not return parsable trend items');
  }

  return items.slice(0, count).map((item) => ({
    type: (selections.type ?? 'trend') as CultureType,
    category: item.category || selections.topic,
    title: item.title || 'Coach trend update',
    description: item.description || 'Fresh trend insight for your coaching conversations.',
    engagementText: item.engagementText || 'Trending now',
    imagePrompt: item.imagePrompt || `Luxury retail trend visual for ${selections.topic}`,
    imageUrl: null,
    trendQuery: selections.customQuery?.trim() || selections.topic,
    selectionPayload: selections as unknown as Record<string, unknown>,
  }));
}

function buildImagePrompt(prompt: string, options: GeminiImageOptions): string {
  const parts = [prompt];
  if (options.realWorldAccuracy || options.enableSearchGrounding) {
    parts.push('Use grounded, real-world accurate details where possible.');
  }
  if (options.upscale4k) {
    parts.push('Produce ultra high-resolution output suitable for 4K upscaling (3840x2160).');
  }
  return parts.join(' ');
}

async function parseErrorText(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = body?.error?.message || body?.message || JSON.stringify(body);
    return `${response.status}: ${message}`;
  } catch {
    try {
      const text = await response.text();
      return `${response.status}: ${text || 'Unknown error'}`;
    } catch {
      return `${response.status}: Unknown error`;
    }
  }
}

async function generateImagesWithGemini(
  prompt: string,
  options: GeminiImageOptions = {}
): Promise<{ images: string[]; textParts: string[]; attemptLabel: string }> {
  const apiKey = getGeminiApiKey();
  const numberOfImages = Math.max(1, Math.min(4, options.numberOfImages ?? 1));
  const enhancedPrompt = buildImagePrompt(prompt, options);
  const aspectRatio = options.aspectRatio || '16:9';

  const images: string[] = [];
  const textParts: string[] = [];

  for (let i = 0; i < numberOfImages; i += 1) {
    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: {
                aspectRatio,
              },
            },
          }),
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      return {
        images,
        textParts: [...textParts, `Primary Gemini request timed out or failed (${msg})`],
        attemptLabel: 'gemini-3.1-looped',
      };
    }

    if (!response.ok) {
      const errorDetail = await parseErrorText(response);
      return {
        images,
        textParts: [...textParts, `Primary Gemini request failed (${errorDetail})`],
        attemptLabel: 'gemini-3.1-looped',
      };
    }

    const payload = await response.json();
    const candidates = payload?.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        const mime = part?.inlineData?.mimeType;
        const data = part?.inlineData?.data;
        if (mime?.startsWith('image/') && data) {
          const publicUrl = await uploadImageToStorage(data, mime);
          if (publicUrl) {
            images.push(publicUrl);
          } else {
            textParts.push('Image generated but storage upload failed');
          }
        } else if (typeof part?.text === 'string') {
          textParts.push(part.text);
        }
      }
    }
  }

  return { images, textParts, attemptLabel: 'gemini-3.1-looped' };
}

async function generateImagesWithGeminiFallback(
  prompt: string,
  options: GeminiImageOptions = {}
): Promise<{ images: string[]; textParts: string[]; attemptLabel: string }> {
  const apiKey = getGeminiApiKey();
  const numberOfImages = Math.max(1, Math.min(4, options.numberOfImages ?? 1));
  const enhancedPrompt = buildImagePrompt(prompt, options);
  const images: string[] = [];
  const textParts: string[] = [];

  for (let i = 0; i < numberOfImages; i += 1) {
    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ parts: [{ text: enhancedPrompt }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      return {
        images,
        textParts: [...textParts, `Fallback Gemini request timed out or failed (${msg})`],
        attemptLabel: 'gemini-2.0-flash-exp',
      };
    }

    if (!response.ok) {
      const errorDetail = await parseErrorText(response);
      return {
        images,
        textParts: [...textParts, `Fallback Gemini request failed (${errorDetail})`],
        attemptLabel: 'gemini-2.0-flash-exp',
      };
    }

    const payload = await response.json();
    const candidates = payload?.candidates || [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        const mime = part?.inlineData?.mimeType;
        const data = part?.inlineData?.data;
        if (mime?.startsWith('image/') && data) {
          const publicUrl = await uploadImageToStorage(data, mime);
          if (publicUrl) {
            images.push(publicUrl);
          } else {
            textParts.push('Image generated but storage upload failed');
          }
        } else if (typeof part?.text === 'string') {
          textParts.push(part.text);
        }
      }
    }
  }

  return { images, textParts, attemptLabel: 'gemini-2.0-flash-exp' };
}

export async function generateTrendCandidates(selections: TrendSelections): Promise<GeneratedTrendCandidate[]> {
  return generateTrendTextFromPerplexity(selections);
}

export async function generateCandidateImages(
  imagePrompt: string,
  options: GeminiImageOptions = {}
): Promise<string[]> {
  const primary = await generateImagesWithGemini(imagePrompt, options);
  if (primary.images.length > 0) return primary.images;
  const fallback = await generateImagesWithGeminiFallback(imagePrompt, options);
  return fallback.images;
}

export async function generateCandidateImagesDetailed(
  imagePrompt: string,
  options: GeminiImageOptions = {}
): Promise<{ images: string[]; diagnostics: string }> {
  const primary = await generateImagesWithGemini(imagePrompt, options);
  if (primary.images.length > 0) {
    return {
      images: primary.images,
      diagnostics: `${primary.attemptLabel}: ${primary.images.length} image(s)`,
    };
  }

  const fallback = await generateImagesWithGeminiFallback(imagePrompt, options);
  if (fallback.images.length > 0) {
    return {
      images: fallback.images,
      diagnostics: `${primary.attemptLabel} returned no images; ${fallback.attemptLabel} generated ${fallback.images.length} image(s)`,
    };
  }

  const detail = [...primary.textParts, ...fallback.textParts].filter(Boolean).slice(0, 3).join(' | ');
  return {
    images: [],
    diagnostics:
      detail ||
      `${primary.attemptLabel} and ${fallback.attemptLabel} returned no image data`,
  };
}

export async function generateCandidateImage(
  imagePrompt: string,
  options: GeminiImageOptions = {}
): Promise<string | null> {
  const images = await generateCandidateImages(imagePrompt, options);
  return images[0] || null;
}
