import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getValidatedAdminUser } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let storeName: string | null = null;
  let storeNumber: string | null = null;

  if (adminUser.profile.store_id) {
    const supabase = getAdminClient();
    const { data: store } = await supabase
      .from('stores')
      .select('store_name, store_number')
      .eq('id', adminUser.profile.store_id)
      .single();

    storeName = store?.store_name ?? null;
    storeNumber = store?.store_number ?? null;
  }

  return NextResponse.json({
    user: {
      id: adminUser.profile.id,
      email: adminUser.profile.email,
      first_name: adminUser.profile.first_name,
      last_name: adminUser.profile.last_name,
      display_name: adminUser.profile.display_name,
      role: adminUser.profile.role,
      status: adminUser.profile.status,
      store_id: adminUser.profile.store_id,
      store_name: storeName,
      store_number: storeNumber,
      avatar_url: adminUser.profile.avatar_url,
    },
    role: adminUser.profile.role,
    storeId: adminUser.profile.store_id,
  });
}
