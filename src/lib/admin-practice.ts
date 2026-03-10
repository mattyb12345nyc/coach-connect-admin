export interface PracticeSessionsQuery {
  page: number;
  limit: number;
  offset: number;
  userId: string | null;
  storeId: string | null;
  scoringStatus: string | null;
  difficulty: string | null;
  search: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface PracticeSessionRecord {
  id: string;
  user_id: string;
  overall_score: number | null;
  created_at: string;
  persona: string | null;
  difficulty: string | null;
  scoring_status: string | null;
  duration_seconds: number | null;
  scores: unknown;
  highlights: unknown;
  summary: string | null;
  transcript: unknown;
  scoring_error: string | null;
}

export interface PracticeProfileRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  store_id: string | null;
}

export interface PracticeStoreRecord {
  id: string;
  store_name: string | null;
  store_number: string | null;
  city: string | null;
  state: string | null;
}

export interface PracticeTopPerformer {
  user_id: string;
  name: string;
  avatar_url: string | null;
  average_score: number;
  sessions_count: number;
  store_id: string | null;
  store_name: string | null;
  store_number: string | null;
}

export interface PracticeStats {
  total_sessions: number;
  completed_sessions: number;
  average_score: number | null;
  sessions_by_difficulty: Array<{ difficulty: string; count: number }>;
  sessions_by_persona: Array<{ persona: string; count: number }>;
  top_performers: PracticeTopPerformer[];
  sessions_this_week: number;
  top_performing_store: {
    store_id: string | null;
    store_name: string | null;
    store_number: string | null;
    average_score: number;
    sessions_count: number;
  } | null;
}

export interface NormalizedTranscriptEntry {
  speaker: string;
  text: string;
}

export interface NormalizedHighlight {
  type: string | null;
  text: string;
}

export interface NormalizedScoreBreakdownEntry {
  key: string;
  score: number;
}

function parsePositiveInteger(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (max && parsed > max) return max;
  return parsed;
}

function parseDateString(value: string | null): string | null {
  if (!value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getDisplayName(profile?: PracticeProfileRecord | null): string {
  if (!profile) return 'Unknown Associate';
  const fallback = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return profile.display_name || fallback || 'Unknown Associate';
}

function roundAverage(total: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(total / count);
}

export function parsePracticeSessionsQuery(params: URLSearchParams): PracticeSessionsQuery {
  const page = parsePositiveInteger(params.get('page'), 1);
  const limit = parsePositiveInteger(params.get('limit'), 20, 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    userId: params.get('userId')?.trim() || null,
    storeId: params.get('storeId')?.trim() || null,
    scoringStatus: params.get('scoring_status')?.trim() || null,
    difficulty: params.get('difficulty')?.trim().toLowerCase() || null,
    search: params.get('search')?.trim() || null,
    dateFrom: parseDateString(params.get('dateFrom')),
    dateTo: parseDateString(params.get('dateTo')),
  };
}

export function normalizeTranscript(transcript: unknown): NormalizedTranscriptEntry[] {
  if (typeof transcript === 'string') {
    return transcript.trim()
      ? [{ speaker: 'transcript', text: transcript.trim() }]
      : [];
  }

  if (Array.isArray(transcript)) {
    return transcript.flatMap((entry) => {
      if (typeof entry === 'string') {
        return entry.trim() ? [{ speaker: 'transcript', text: entry.trim() }] : [];
      }

      if (!isObject(entry)) return [];

      const textValue = entry.text ?? entry.content ?? entry.message;
      if (typeof textValue !== 'string' || !textValue.trim()) return [];

      const speakerValue = entry.speaker ?? entry.role ?? entry.name;
      return [{
        speaker: typeof speakerValue === 'string' && speakerValue.trim()
          ? speakerValue.trim()
          : 'speaker',
        text: textValue.trim(),
      }];
    });
  }

  if (isObject(transcript) && Array.isArray(transcript.messages)) {
    return normalizeTranscript(transcript.messages);
  }

  return [];
}

export function normalizeHighlights(highlights: unknown): NormalizedHighlight[] {
  if (!Array.isArray(highlights)) return [];

  return highlights.flatMap((highlight) => {
    if (typeof highlight === 'string') {
      return highlight.trim() ? [{ type: null, text: highlight.trim() }] : [];
    }

    if (!isObject(highlight)) return [];

    const text = highlight.text ?? highlight.message ?? highlight.content;
    if (typeof text !== 'string' || !text.trim()) return [];

    const type = typeof highlight.type === 'string' && highlight.type.trim()
      ? highlight.type.trim()
      : null;

    return [{ type, text: text.trim() }];
  });
}

export function normalizeScoreBreakdown(scores: unknown): NormalizedScoreBreakdownEntry[] {
  if (!isObject(scores)) return [];

  return Object.entries(scores).flatMap(([key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return [{ key, score: value }];
    }

    if (isObject(value) && typeof value.score === 'number' && Number.isFinite(value.score)) {
      return [{ key, score: value.score }];
    }

    return [];
  });
}

export function computePracticeStats({
  sessions,
  profilesByUserId,
  storesById,
  now = new Date(),
}: {
  sessions: PracticeSessionRecord[];
  profilesByUserId: Map<string, PracticeProfileRecord>;
  storesById: Map<string, PracticeStoreRecord>;
  now?: Date;
}): PracticeStats {
  const completedSessions = sessions.filter(
    (session) => session.scoring_status !== null && session.overall_score !== null
  );

  const totalScore = completedSessions.reduce(
    (sum, session) => sum + (session.overall_score ?? 0),
    0
  );

  const difficultyCounts = new Map<string, number>();
  const personaCounts = new Map<string, number>();
  const performerAccumulator = new Map<string, {
    totalScore: number;
    sessionsCount: number;
    profile: PracticeProfileRecord | undefined;
  }>();
  const storeAccumulator = new Map<string | null, {
    totalScore: number;
    sessionsCount: number;
    store: PracticeStoreRecord | null;
  }>();

  const weekCutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  let sessionsThisWeek = 0;

  for (const session of sessions) {
    if (session.difficulty) {
      difficultyCounts.set(
        session.difficulty,
        (difficultyCounts.get(session.difficulty) ?? 0) + 1
      );
    }

    if (session.persona) {
      personaCounts.set(
        session.persona,
        (personaCounts.get(session.persona) ?? 0) + 1
      );
    }

    if (new Date(session.created_at) >= weekCutoff) {
      sessionsThisWeek += 1;
    }

    if (session.overall_score === null) continue;

    const profile = profilesByUserId.get(session.user_id);
    const performerEntry = performerAccumulator.get(session.user_id) ?? {
      totalScore: 0,
      sessionsCount: 0,
      profile,
    };
    performerEntry.totalScore += session.overall_score;
    performerEntry.sessionsCount += 1;
    if (!performerEntry.profile && profile) performerEntry.profile = profile;
    performerAccumulator.set(session.user_id, performerEntry);

    const storeId = profile?.store_id ?? null;
    const store = storeId ? (storesById.get(storeId) ?? null) : null;
    const storeEntry = storeAccumulator.get(storeId) ?? {
      totalScore: 0,
      sessionsCount: 0,
      store,
    };
    storeEntry.totalScore += session.overall_score;
    storeEntry.sessionsCount += 1;
    if (!storeEntry.store && store) storeEntry.store = store;
    storeAccumulator.set(storeId, storeEntry);
  }

  const topPerformers = Array.from(performerAccumulator.entries())
    .filter(([, value]) => value.sessionsCount >= 3)
    .map(([userId, value]) => {
      const averageScore = roundAverage(value.totalScore, value.sessionsCount) ?? 0;
      const profile = value.profile;
      const store = profile?.store_id ? (storesById.get(profile.store_id) ?? null) : null;

      return {
        user_id: userId,
        name: getDisplayName(profile),
        avatar_url: profile?.avatar_url ?? null,
        average_score: averageScore,
        sessions_count: value.sessionsCount,
        store_id: profile?.store_id ?? null,
        store_name: store?.store_name ?? null,
        store_number: store?.store_number ?? null,
      };
    })
    .sort((left, right) => {
      if (right.average_score !== left.average_score) {
        return right.average_score - left.average_score;
      }

      return right.sessions_count - left.sessions_count;
    })
    .slice(0, 5);

  const topPerformingStore = Array.from(storeAccumulator.entries())
    .map(([storeId, value]) => ({
      store_id: storeId,
      store_name: value.store?.store_name ?? null,
      store_number: value.store?.store_number ?? null,
      average_score: roundAverage(value.totalScore, value.sessionsCount) ?? 0,
      sessions_count: value.sessionsCount,
    }))
    .sort((left, right) => {
      if (right.average_score !== left.average_score) {
        return right.average_score - left.average_score;
      }

      return right.sessions_count - left.sessions_count;
    })[0] ?? null;

  return {
    total_sessions: sessions.length,
    completed_sessions: completedSessions.length,
    average_score: roundAverage(totalScore, completedSessions.length),
    sessions_by_difficulty: Array.from(difficultyCounts.entries())
      .map(([difficulty, count]) => ({ difficulty, count }))
      .sort((left, right) => left.difficulty.localeCompare(right.difficulty)),
    sessions_by_persona: Array.from(personaCounts.entries())
      .map(([persona, count]) => ({ persona, count }))
      .sort((left, right) => left.persona.localeCompare(right.persona)),
    top_performers: topPerformers,
    sessions_this_week: sessionsThisWeek,
    top_performing_store: topPerformingStore,
  };
}
