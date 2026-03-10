const defaultConsumerAppUrl = 'https://coach-connect-demo.netlify.app';
const defaultAdminAppUrl = 'https://coach-connect-admin.netlify.app';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const consumerAppUrl = stripTrailingSlash(
  process.env.NEXT_PUBLIC_CONSUMER_APP_URL ?? defaultConsumerAppUrl
);

const adminAppUrl = stripTrailingSlash(
  process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? defaultAdminAppUrl
);

export const config = {
  consumerAppUrl,
  adminAppUrl,
  netlifyFunctions: {
    publishPulse: `${consumerAppUrl}/.netlify/functions/publish-pulse`,
    sendInvite: `${consumerAppUrl}/.netlify/functions/send-invite`,
  },
  inviteUrl: (token: string) => `${consumerAppUrl}/invite?token=${encodeURIComponent(token)}`,
};
