import { Resend } from 'resend';
import { getValidatedAdminUser } from '../../../src/lib/admin-auth';
import {
  AdminUserProvisioningError,
  createAdminUser,
} from '../../../src/lib/admin/user-provisioning';
import { sendCoachPulseInviteEmail } from '../../../src/lib/admin/user-email';
import { getAdminClient } from '../../../src/lib/supabase';

function toHeaders(nodeHeaders) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(nodeHeaders || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    if (typeof value === 'string') {
      headers.set(key, value);
    }
  }

  return headers;
}

function createInviteEmailSender() {
  return async ({ email, fullName, actionLink }) => {
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

function getErrorStatus(error) {
  if (error instanceof AdminUserProvisioningError) {
    return error.statusCode;
  }

  if (error instanceof SyntaxError) {
    return 400;
  }

  return 500;
}

function getErrorMessage(error) {
  if (error instanceof AdminUserProvisioningError) {
    return error.message;
  }

  if (error instanceof SyntaxError) {
    return 'Invalid JSON body';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const adminUser = await getValidatedAdminUser({
    headers: toHeaders(request.headers),
  });

  if (!adminUser) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const result = await createAdminUser(body, {
      supabaseAdmin: getAdminClient(),
      sendInviteEmail: createInviteEmailSender(),
    });

    return response.status(201).json(result);
  } catch (error) {
    return response.status(getErrorStatus(error)).json({
      error: getErrorMessage(error),
    });
  }
}
