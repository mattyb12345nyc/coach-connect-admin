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

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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

async function generateImagesWithGemini(
  prompt: string,
  options: GeminiImageOptions = {}
): Promise<{ images: string[]; textParts: string[] }> {
  const apiKey = getGeminiApiKey();
  const numberOfImages = Math.max(1, Math.min(4, options.numberOfImages ?? 1));
  const enableGrounding = Boolean(options.enableSearchGrounding || options.realWorldAccuracy);
  const enhancedPrompt = buildImagePrompt(prompt, options);
  const imageSize = options.upscale4k ? '4K' : options.imageSize || '2K';
  const aspectRatio = options.aspectRatio || '16:9';
  const thinkingLevel = options.thinkingLevel || 'HIGH';

  const tools: Array<Record<string, object>> = [{ image_generation: {} }];
  if (enableGrounding) {
    tools.push({ google_search: {} });
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        tools,
        ...(enableGrounding ? { toolConfig: { enableGrounding: true } } : {}),
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
          thinkingConfig: {
            thinkingLevel,
          },
          number_of_images: numberOfImages,
        },
      }),
    }
  );

  if (!response.ok) return { images: [], textParts: [] };

  const payload = await response.json();
  const candidates = payload?.candidates || [];
  const images: string[] = [];
  const textParts: string[] = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      const mime = part?.inlineData?.mimeType;
      const data = part?.inlineData?.data;
      if (mime?.startsWith('image/') && data) {
        images.push(`data:${mime};base64,${data}`);
      } else if (typeof part?.text === 'string') {
        textParts.push(part.text);
      }
    }
  }

  return { images, textParts };
}

export async function generateTrendCandidates(selections: TrendSelections): Promise<GeneratedTrendCandidate[]> {
  return generateTrendTextFromPerplexity(selections);
}

export async function generateCandidateImages(
  imagePrompt: string,
  options: GeminiImageOptions = {}
): Promise<string[]> {
  const result = await generateImagesWithGemini(imagePrompt, options);
  return result.images;
}

export async function generateCandidateImage(
  imagePrompt: string,
  options: GeminiImageOptions = {}
): Promise<string | null> {
  const images = await generateCandidateImages(imagePrompt, options);
  return images[0] || null;
}
