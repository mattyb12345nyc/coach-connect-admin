export type CoachPulseUserEmailPayload = {
  email: string;
  fullName: string;
  actionLink: string;
};

export type CoachPulseActionEmailOptions = {
  subject: string;
  introLine: string;
  buttonLabel: string;
};

export type ResendClientLike = {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{
      error?: {
        message?: string;
      } | null;
    }>;
  };
};

export function buildCoachPulseActionEmailHtml(
  {
    fullName,
    actionLink,
  }: Omit<CoachPulseUserEmailPayload, 'email'>,
  options: CoachPulseActionEmailOptions
): string {
  return `
    <div style="background:#1C1917;padding:48px 24px;font-family:Georgia,serif;text-align:center;">
      <img src="https://cdn.mcauto-images-production.sendgrid.net/d157e984273caff5/3acafde1-d902-4fab-9ed1-4e8afcbe35fd/225x225.png"
           width="80" style="margin-bottom:24px;" />
      <h1 style="color:#C9A227;font-size:28px;margin-bottom:8px;">Coach Pulse</h1>
      <p style="color:#F5F0EB;font-size:16px;margin-bottom:32px;">
        Hi ${fullName},<br/>${options.introLine}
      </p>
      <a href="${actionLink}"
         style="display:inline-block;background:#C9A227;color:#1C1917;padding:16px 40px;
                font-size:14px;font-weight:700;text-decoration:none;letter-spacing:1px;
                text-transform:uppercase;">
        ${options.buttonLabel}
      </a>
      <p style="color:#8B7355;font-size:12px;margin-top:32px;">
        This link expires in 24 hours.
      </p>
    </div>
  `.trim();
}

export async function sendCoachPulseInviteEmail(
  resend: ResendClientLike,
  payload: CoachPulseUserEmailPayload
): Promise<void> {
  return sendCoachPulseActionEmail(resend, payload, {
    subject: "You're Invited to Coach Pulse",
    introLine: "You've been invited to join the Coach Pulse platform.",
    buttonLabel: 'Set Your Password',
  });
}

export async function sendCoachPulseActionEmail(
  resend: ResendClientLike,
  payload: CoachPulseUserEmailPayload,
  options: CoachPulseActionEmailOptions
): Promise<void> {
  const result = await resend.emails.send({
    from: 'Coach Pulse <noreply@coach-mail.futureproof.work>',
    to: payload.email,
    subject: options.subject,
    html: buildCoachPulseActionEmailHtml({
      fullName: payload.fullName,
      actionLink: payload.actionLink,
    }, options),
  });

  if (result.error) {
    throw new Error(result.error.message || 'Failed to send Coach Pulse invite email');
  }
}
