import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign up' };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ username?: string }> }) {
  const { username } = await searchParams;
  const safe = (username ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  return <AuthForm mode="signup" defaultUsername={safe} />;
}
