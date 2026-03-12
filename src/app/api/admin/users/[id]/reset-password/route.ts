import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import { fetchAuthEmailMapByUserIds } from '@/lib/admin-directory';
import {
  AdminUserProvisioningError,
  type AdminSupabaseClientLike,
} from '@/lib/admin/user-provisioning';
import { sendCoachPulseActionEmail } from '@/lib/admin/user-email';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type ProfileNameRecord = {
  display_name: string | null;
};

function getDisplayName(profile: ProfileNameRecord | null, email: string): string {
  return profile?.display_name?.trim() || email;
}

function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new AdminUserProvisioningError('RESEND_API_KEY must be set to send password reset emails', 500);
  }

  return new Resend(resendApiKey);
}

function getErrorResponse(error: unknown) {
  if (error instanceof AdminUserProvisioningError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = context.params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const emailByUserId = await fetchAuthEmailMapByUserIds(supabaseAdmin, [userId]);
    const email = emailByUserId.get(userId)?.trim() || null;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new AdminUserProvisioningError(profileError.message, 500);
    }

    const { data: linkData, error: linkError } = await (
      supabaseAdmin as unknown as AdminSupabaseClientLike
    ).auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError) {
      throw new AdminUserProvisioningError(
        linkError instanceof Error ? linkError.message : 'Failed to generate password reset link',
        500
      );
    }

    const actionLink = linkData?.properties?.action_link?.trim();
    if (!actionLink) {
      throw new AdminUserProvisioningError('Could not generate a password reset link', 500);
    }

    await sendCoachPulseActionEmail(
      getResendClient(),
      {
        email,
        fullName: getDisplayName(profile as ProfileNameRecord | null, email),
        actionLink,
      },
      {
        subject: 'Reset Your Coach Pulse Password',
        introLine: 'An administrator sent you a secure link to reset your Coach Pulse password.',
        buttonLabel: 'Reset Password',
      }
    );

    return NextResponse.json({ success: true, email });
  } catch (error) {
    return getErrorResponse(error);
  }
}
