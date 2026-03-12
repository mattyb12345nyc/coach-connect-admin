import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getValidatedAdminUser } from '@/lib/admin-auth';
import {
  AdminUserProvisioningError,
  type AdminSupabaseClientLike,
  createAdminUser,
  type CreateAdminUserInput,
} from '@/lib/admin/user-provisioning';
import { sendCoachPulseInviteEmail } from '@/lib/admin/user-email';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function createInviteEmailSender() {
  return async ({ email, fullName, actionLink }: { email: string; fullName: string; actionLink: string }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new AdminUserProvisioningError('RESEND_API_KEY must be set to send invite emails', 500);
    }

    const resend = new Resend(resendApiKey);
    await sendCoachPulseInviteEmail(resend, {
      email,
      fullName,
      actionLink,
    });
  };
}

function getErrorResponse(error: unknown) {
  if (error instanceof AdminUserProvisioningError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateAdminUserInput;
    const result = await createAdminUser(body, {
      supabaseAdmin: getAdminClient() as unknown as AdminSupabaseClientLike,
      sendInviteEmail: createInviteEmailSender(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return getErrorResponse(error);
  }
}
