import { redirect } from 'next/navigation';

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: { token?: string; invite?: string };
}) {
  const token = searchParams?.token || searchParams?.invite;

  if (token) {
    redirect(`/invite?token=${encodeURIComponent(token)}`);
  }

  redirect('/invite');
}
