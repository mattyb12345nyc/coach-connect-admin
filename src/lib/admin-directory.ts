import { getAdminClient } from '@/lib/supabase';

const AUTH_USERS_PAGE_SIZE = 1000;

export async function fetchAuthEmailMapByUserIds(
  supabase: ReturnType<typeof getAdminClient>,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const remainingIds = new Set(userIds);
  const emailByUserId = new Map<string, string | null>();

  if (remainingIds.size === 0) {
    return emailByUserId;
  }

  let page = 1;

  while (remainingIds.size > 0) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      if (!remainingIds.has(user.id)) continue;
      emailByUserId.set(user.id, user.email ?? null);
      remainingIds.delete(user.id);
    }

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return emailByUserId;
}
