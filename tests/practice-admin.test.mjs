import test from 'node:test';
import assert from 'node:assert/strict';

const {
  parsePracticeSessionsQuery,
  computePracticeStats,
  normalizeTranscript,
  normalizeHighlights,
  normalizeScoreBreakdown,
} = await import(new URL('../src/lib/admin-practice.ts', import.meta.url).href);

test('parsePracticeSessionsQuery applies defaults and normalizes filters', () => {
  const query = parsePracticeSessionsQuery(new URLSearchParams());

  assert.deepEqual(query, {
    page: 1,
    limit: 20,
    offset: 0,
    userId: null,
    storeId: null,
    scoringStatus: null,
    difficulty: null,
    search: null,
    dateFrom: null,
    dateTo: null,
  });
});

test('parsePracticeSessionsQuery accepts optional filters and clamps pagination', () => {
  const query = parsePracticeSessionsQuery(new URLSearchParams({
    page: '-2',
    limit: '500',
    userId: 'user-1',
    storeId: 'store-1',
    scoring_status: 'scored',
    difficulty: 'advanced',
    search: 'zoe',
    dateFrom: '2026-03-01T00:00:00.000Z',
    dateTo: '2026-03-09T23:59:59.000Z',
  }));

  assert.deepEqual(query, {
    page: 1,
    limit: 100,
    offset: 0,
    userId: 'user-1',
    storeId: 'store-1',
    scoringStatus: 'scored',
    difficulty: 'advanced',
    search: 'zoe',
    dateFrom: '2026-03-01T00:00:00.000Z',
    dateTo: '2026-03-09T23:59:59.000Z',
  });
});

test('computePracticeStats returns aggregate totals, distributions, and leaders', () => {
  const now = new Date('2026-03-10T12:00:00.000Z');
  const sessions = [
    {
      id: 's1',
      user_id: 'u1',
      overall_score: 90,
      created_at: '2026-03-09T12:00:00.000Z',
      persona: 'Zoe',
      difficulty: 'beginner',
      scoring_status: 'scored',
      duration_seconds: 120,
      scores: { productKnowledge: 23, emotionalConnection: 22 },
      highlights: [{ type: 'positive', text: 'Strong opening' }],
      summary: 'Great job',
      transcript: [{ speaker: 'associate', text: 'Hello!' }],
      scoring_error: null,
    },
    {
      id: 's2',
      user_id: 'u1',
      overall_score: 84,
      created_at: '2026-03-08T12:00:00.000Z',
      persona: 'Zoe',
      difficulty: 'beginner',
      scoring_status: 'scored',
      duration_seconds: 125,
      scores: { productKnowledge: 22 },
      highlights: [],
      summary: 'Good',
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's3',
      user_id: 'u1',
      overall_score: 88,
      created_at: '2026-03-03T12:00:00.000Z',
      persona: 'Maya',
      difficulty: 'intermediate',
      scoring_status: 'scored',
      duration_seconds: 140,
      scores: { objectionHandling: 21 },
      highlights: [],
      summary: 'Solid',
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's4',
      user_id: 'u2',
      overall_score: 72,
      created_at: '2026-03-07T12:00:00.000Z',
      persona: 'Maya',
      difficulty: 'intermediate',
      scoring_status: 'scored',
      duration_seconds: 150,
      scores: { objectionHandling: 19 },
      highlights: [],
      summary: 'Okay',
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's5',
      user_id: 'u2',
      overall_score: 76,
      created_at: '2026-03-06T12:00:00.000Z',
      persona: 'Vanessa',
      difficulty: 'advanced',
      scoring_status: 'scored',
      duration_seconds: 160,
      scores: { objectionHandling: 20 },
      highlights: [],
      summary: 'Okay',
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's6',
      user_id: 'u2',
      overall_score: 78,
      created_at: '2026-03-05T12:00:00.000Z',
      persona: 'Vanessa',
      difficulty: 'advanced',
      scoring_status: 'scored',
      duration_seconds: 170,
      scores: { objectionHandling: 20 },
      highlights: [],
      summary: 'Okay',
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's7',
      user_id: 'u3',
      overall_score: null,
      created_at: '2026-03-01T12:00:00.000Z',
      persona: 'Zoe',
      difficulty: 'beginner',
      scoring_status: 'scoring_failed',
      duration_seconds: 90,
      scores: null,
      highlights: null,
      summary: null,
      transcript: null,
      scoring_error: 'Model timeout',
    },
  ];

  const profilesByUserId = new Map([
    ['u1', { id: 'u1', first_name: 'Alice', last_name: 'Jones', display_name: 'Alice Jones', avatar_url: null, store_id: 'store-a' }],
    ['u2', { id: 'u2', first_name: 'Ben', last_name: 'Smith', display_name: 'Ben Smith', avatar_url: null, store_id: 'store-b' }],
    ['u3', { id: 'u3', first_name: 'Cara', last_name: 'Mills', display_name: 'Cara Mills', avatar_url: null, store_id: 'store-a' }],
  ]);

  const storesById = new Map([
    ['store-a', { id: 'store-a', store_name: 'Beverly Hills', store_number: '1001', city: 'Beverly Hills', state: 'CA' }],
    ['store-b', { id: 'store-b', store_name: 'SoHo', store_number: '2002', city: 'New York', state: 'NY' }],
  ]);

  const stats = computePracticeStats({
    sessions,
    profilesByUserId,
    storesById,
    now,
  });

  assert.equal(stats.total_sessions, 7);
  assert.equal(stats.completed_sessions, 6);
  assert.equal(stats.average_score, 81);
  assert.equal(stats.sessions_this_week, 6);
  assert.deepEqual(stats.sessions_by_difficulty, [
    { difficulty: 'advanced', count: 2 },
    { difficulty: 'beginner', count: 3 },
    { difficulty: 'intermediate', count: 2 },
  ]);
  assert.deepEqual(stats.sessions_by_persona, [
    { persona: 'Maya', count: 2 },
    { persona: 'Vanessa', count: 2 },
    { persona: 'Zoe', count: 3 },
  ]);
  assert.equal(stats.top_performers[0].user_id, 'u1');
  assert.equal(stats.top_performers[0].average_score, 87);
  assert.equal(stats.top_performing_store?.store_id, 'store-a');
  assert.equal(stats.top_performing_store?.average_score, 87);
});

test('computePracticeStats only counts scored sessions as completed', () => {
  const sessions = [
    {
      id: 's1',
      user_id: 'u1',
      overall_score: 90,
      created_at: '2026-03-09T12:00:00.000Z',
      persona: 'Zoe',
      difficulty: 'beginner',
      scoring_status: 'scored',
      duration_seconds: 120,
      scores: {},
      highlights: [],
      summary: null,
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's2',
      user_id: 'u1',
      overall_score: 88,
      created_at: '2026-03-08T12:00:00.000Z',
      persona: 'Maya',
      difficulty: 'intermediate',
      scoring_status: 'pending_rescore',
      duration_seconds: 120,
      scores: {},
      highlights: [],
      summary: null,
      transcript: [],
      scoring_error: null,
    },
    {
      id: 's3',
      user_id: 'u1',
      overall_score: 70,
      created_at: '2026-03-07T12:00:00.000Z',
      persona: 'Vanessa',
      difficulty: 'advanced',
      scoring_status: 'scoring_failed',
      duration_seconds: 120,
      scores: {},
      highlights: [],
      summary: null,
      transcript: [],
      scoring_error: 'timeout',
    },
  ];

  const stats = computePracticeStats({
    sessions,
    profilesByUserId: new Map(),
    storesById: new Map(),
  });

  assert.equal(stats.completed_sessions, 1);
  assert.equal(stats.average_score, 90);
});

test('normalizeTranscript handles array, nested messages, and plain strings', () => {
  assert.deepEqual(
    normalizeTranscript([
      { speaker: 'associate', text: 'Welcome in!' },
      { role: 'customer', content: 'I need a gift.' },
    ]),
    [
      { speaker: 'associate', text: 'Welcome in!' },
      { speaker: 'customer', text: 'I need a gift.' },
    ]
  );

  assert.deepEqual(
    normalizeTranscript({ messages: [{ speaker: 'coach', message: 'Try asking about style.' }] }),
    [{ speaker: 'coach', text: 'Try asking about style.' }]
  );

  assert.deepEqual(
    normalizeTranscript('Single transcript block'),
    [{ speaker: 'transcript', text: 'Single transcript block' }]
  );
});

test('normalizeHighlights and normalizeScoreBreakdown produce renderable arrays', () => {
  assert.deepEqual(
    normalizeHighlights([
      { type: 'positive', text: 'Great rapport' },
      'Ask one more follow-up question',
    ]),
    [
      { type: 'positive', text: 'Great rapport' },
      { type: null, text: 'Ask one more follow-up question' },
    ]
  );

  assert.deepEqual(
    normalizeScoreBreakdown({ productKnowledge: 23, emotionalConnection: 21 }),
    [
      { key: 'productKnowledge', score: 23 },
      { key: 'emotionalConnection', score: 21 },
    ]
  );
});
