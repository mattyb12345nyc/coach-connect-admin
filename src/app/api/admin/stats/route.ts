import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns aggregate stats for the Users dashboard:
 *  - avgScore: real average practice score across all sessions (null if no data)
 *  - totalSessions: total number of completed practice sessions
 *
 * Queries the practice_sessions table. If that table does not exist yet
 * (Supabase returns a relation-not-found error), returns null values so the
 * UI can display "No scores yet" instead of "0%".
 */
export async function GET() {
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('overall_score, scoring_status')
      .eq('scoring_status', 'completed');

    // Table doesn't exist or permission denied — no scores yet
    if (error) {
      return NextResponse.json({ avgScore: null, totalSessions: 0 });
    }

    const sessions = data ?? [];
    const withScore = sessions.filter(
      s => s.overall_score !== null && s.overall_score !== undefined && !isNaN(Number(s.overall_score))
    );

    if (withScore.length === 0) {
      return NextResponse.json({ avgScore: null, totalSessions: sessions.length });
    }

    const avg = Math.round(
      withScore.reduce((sum, s) => sum + Number(s.overall_score), 0) / withScore.length
    );

    return NextResponse.json({ avgScore: avg, totalSessions: sessions.length });
  } catch {
    return NextResponse.json({ avgScore: null, totalSessions: 0 });
  }
}
