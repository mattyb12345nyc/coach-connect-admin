import { redirect } from 'next/navigation';

export default function Home({
  searchParams,
}: {
  searchParams?: { invite?: string; token?: string };
}) {
  const token = searchParams?.invite || searchParams?.token;

  if (token) {
    redirect(`/invite?token=${encodeURIComponent(token)}`);
  }

  redirect('/admin/today');
}
