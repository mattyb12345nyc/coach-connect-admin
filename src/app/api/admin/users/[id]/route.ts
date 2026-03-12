import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { getUserDetails } from '@/lib/admin/analytics';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const identityKey = decodeURIComponent(pathSegments[pathSegments.length - 1]);
    
    if (!identityKey) {
      return NextResponse.json(
        { success: false, error: 'Identity key is required' },
        { status: 400 }
      );
    }
    
    const userDetails = await getUserDetails(identityKey);
    
    if (!userDetails) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: userDetails,
    });
    
  } catch (error) {
    console.error('[ADMIN_API] Error fetching user details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (id === adminUser.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      throw profileError;
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      throw authError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
