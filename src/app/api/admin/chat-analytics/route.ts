import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.CUSTOMGPT_API_BASE_URL ?? 'https://app.customgpt.ai/api/v1';
const API_KEY = process.env.CUSTOMGPT_API_KEY ?? '';
const PROJECT_ID = process.env.NEXT_PUBLIC_COACH_PROJECT_ID ?? '90868';

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'do',
  'how', 'what', 'when', 'where', 'who', 'which', 'why', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'that', 'this', 'these', 'those',
  'it', 'its', 'if', 'then', 'so', 'as', 'not', 'no', 'just', 'there', 'here',
  'they', 'we', 'you', 'he', 'she', 'him', 'her', 'them', 'us', 'our', 'your',
  'their', 'who', 'get', 'say', 'go', 'make', 'know', 'think', 'see', 'come',
  'want', 'look', 'use', 'find', 'give', 'tell', 'work', 'call', 'try', 'ask',
  'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'show',
  'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen',
  'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue',
  'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop',
  'create', 'speak', 'read', 'spend', 'grow', 'open', 'walk', 'win', 'offer',
  'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send',
  'seem', 'help', 'talk', 'turn', 'start', 'might', 'ok', 'okay', 'sure', 'like',
  'good', 'great', 'also', 'too', 'very', 'much', 'more', 'some', 'any', 'all',
  'both', 'each', 'few', 'other', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'once', 'same', 'than', 'have', 'only', 'own', 'down', 'while', 'did',
]);

const TOPIC_CLUSTERS: { label: string; keywords: string[] }[] = [
  { label: 'Pricing & Value', keywords: ['price', 'expensive', 'cost', 'afford', 'cheap', 'value', 'worth', 'money', 'pay', 'budget'] },
  { label: 'Product Materials', keywords: ['leather', 'material', 'quality', 'craft', 'canvas', 'suede', 'fabric', 'pebbled', 'smooth', 'textured', 'hardware', 'zipper'] },
  { label: 'Gift Shopping', keywords: ['gift', 'present', 'birthday', 'anniversary', 'someone', 'recipient', 'surprise', 'holiday', 'wedding'] },
  { label: 'Sales Closing', keywords: ['close', 'closing', 'hesitant', 'convince', 'commit', 'decision', 'buy', 'purchase', 'sale', 'convert'] },
  { label: 'Upselling', keywords: ['upsell', 'additional', 'complement', 'accessories', 'recommend', 'suggest', 'pair', 'bundle', 'upgrade'] },
  { label: 'Customer Profiles', keywords: ['customer', 'client', 'shopper', 'tourist', 'gen', 'tiktok', 'social', 'young', 'teen', 'loyal', 'returning'] },
  { label: 'Product Knowledge', keywords: ['tabby', 'brooklyn', 'willow', 'cargo', 'beat', 'field', 'bag', 'style', 'collection', 'outlet', 'mainline', 'limited', 'design'] },
  { label: 'Returns & Exchanges', keywords: ['return', 'exchange', 'refund', 'receipt', 'policy', 'damaged', 'defect', 'repair', 'complaint', 'issue'] },
  { label: 'Objection Handling', keywords: ['objection', 'think', 'maybe', 'later', 'browse', 'browsing', 'compare', 'wait', 'expensive', 'online', 'competitor'] },
  { label: 'Store Experience', keywords: ['store', 'floor', 'display', 'showcase', 'staff', 'associate', 'manager', 'fitting', 'try', 'hold'] },
];

const NO_ANSWER_PHRASES = [
  "i don't have information",
  "i couldn't find",
  "no information",
  "outside my knowledge",
  "not able to answer",
  "don't have enough",
  "unable to find",
  "i'm sorry, i don't",
];

async function cgFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CustomGPT API error ${res.status}: ${path}`);
  return res.json();
}

function getWeekBoundaries() {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 14);
  return { startOfThisWeek, startOfLastWeek };
}

function clusterTopics(queries: string[]): { label: string; count: number; keywords: string[] }[] {
  const clusterCounts: Record<string, { count: number; matched: Set<string> }> = {};
  TOPIC_CLUSTERS.forEach(c => { clusterCounts[c.label] = { count: 0, matched: new Set() }; });

  for (const q of queries) {
    const lower = q.toLowerCase();
    for (const cluster of TOPIC_CLUSTERS) {
      for (const kw of cluster.keywords) {
        if (lower.includes(kw)) {
          clusterCounts[cluster.label].count++;
          clusterCounts[cluster.label].matched.add(kw);
          break;
        }
      }
    }
  }

  return Object.entries(clusterCounts)
    .filter(([, v]) => v.count > 0)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8)
    .map(([label, v]) => ({ label, count: v.count, keywords: Array.from(v.matched) }));
}

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function topQuestions(queries: string[]): { query: string; count: number }[] {
  const normalized = queries.map(q => q.trim().toLowerCase().replace(/\s+/g, ' '));
  const counts: Record<string, { original: string; count: number }> = {};
  for (let i = 0; i < queries.length; i++) {
    const key = normalized[i];
    if (!counts[key]) counts[key] = { original: queries[i], count: 0 };
    counts[key].count++;
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ original, count }) => ({ query: original, count }));
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    // Fetch settings for no_answer_message
    let noAnswerMessage = '';
    try {
      const settingsRes = await cgFetch(`/projects/${PROJECT_ID}/settings`);
      noAnswerMessage = (settingsRes?.data?.no_answer_message ?? settingsRes?.no_answer_message ?? '').toLowerCase();
    } catch { /* non-blocking */ }

    // Fetch conversations (up to 2 pages = ~100 conversations)
    const [page1Res, page2Res] = await Promise.allSettled([
      cgFetch(`/projects/${PROJECT_ID}/conversations?page=1&order=desc&per_page=50`),
      cgFetch(`/projects/${PROJECT_ID}/conversations?page=2&order=desc&per_page=50`),
    ]);

    const conversations: any[] = [];
    if (page1Res.status === 'fulfilled') {
      conversations.push(...(page1Res.value?.data?.data ?? []));
    }
    if (page2Res.status === 'fulfilled') {
      conversations.push(...(page2Res.value?.data?.data ?? []));
    }

    if (conversations.length === 0) {
      return NextResponse.json({
        thisWeek: 0, lastWeek: 0, trend: 0,
        failureRate: 0, avgLength: 0,
        peakHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 })),
        topQuestions: [], topTopics: [],
        totalConversations: 0, totalMessages: 0,
        recentConversations: [],
      });
    }

    // Week stats (conversation-level)
    const { startOfThisWeek, startOfLastWeek } = getWeekBoundaries();
    const thisWeek = conversations.filter(c => new Date(c.created_at) >= startOfThisWeek).length;
    const lastWeek = conversations.filter(c => {
      const d = new Date(c.created_at);
      return d >= startOfLastWeek && d < startOfThisWeek;
    }).length;
    const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    // Avg conversation length from message_count where available
    const withCount = conversations.filter(c => c.message_count != null && c.message_count > 0);
    const avgLengthFromMeta = withCount.length > 0
      ? Math.round(withCount.reduce((s, c) => s + c.message_count, 0) / withCount.length)
      : 0;

    // Fetch messages for up to 25 most recent conversations (parallel batches of 5)
    const toFetch = conversations.slice(0, 25);
    const messageBatches: any[][] = [];

    for (let i = 0; i < toFetch.length; i += 5) {
      const batch = toFetch.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(c => cgFetch(`/projects/${PROJECT_ID}/conversations/${c.session_id}/messages?per_page=50`))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          messageBatches.push(r.value?.data?.messages?.data ?? r.value?.data?.data ?? []);
        }
      }
    }

    const allMessages: any[] = messageBatches.flat();
    const userQueries: string[] = allMessages
      .map(m => (m.user_query ?? '').trim())
      .filter(q => q.length > 5);

    // Failure rate
    let failCount = 0;
    for (const m of allMessages) {
      const response = (m.openai_response ?? '').toLowerCase();
      if (!response || response.length < 10) { failCount++; continue; }
      if (noAnswerMessage && response.includes(noAnswerMessage)) { failCount++; continue; }
      if (NO_ANSWER_PHRASES.some(p => response.includes(p))) { failCount++; }
    }
    const failureRate = allMessages.length > 0
      ? Math.round((failCount / allMessages.length) * 100)
      : 0;

    // Avg conversation length from fetched messages if meta was unavailable
    const avgLength = avgLengthFromMeta > 0
      ? avgLengthFromMeta
      : messageBatches.length > 0
        ? Math.round(messageBatches.reduce((s, b) => s + b.length, 0) / messageBatches.length)
        : 0;

    // Peak hours from message timestamps
    const hourCounts = new Array(24).fill(0);
    for (const m of allMessages) {
      const ts = m.created_at ?? m.updated_at;
      if (ts) hourCounts[new Date(ts).getHours()]++;
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

    // Top 5 questions
    const topQ = topQuestions(userQueries);

    // Topic clusters
    const topTopics = clusterTopics(userQueries);

    // Recent conversations list (for the table)
    const recentConversations = conversations.slice(0, 30).map(c => ({
      id: c.id,
      session_id: c.session_id,
      name: c.name,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: c.message_count ?? null,
    }));

    return NextResponse.json({
      thisWeek,
      lastWeek,
      trend,
      failureRate,
      avgLength,
      peakHours,
      topQuestions: topQ,
      topTopics,
      totalConversations: conversations.length,
      totalMessages: allMessages.length,
      recentConversations,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Analytics failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
