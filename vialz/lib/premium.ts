import type { BadgeInfo } from './types';

// Keep these in sync with replace_links in supabase/migrations/002_badges_premium.sql.
export const LINK_LIMIT = { free: 10, premium: 30 };

// Shown automatically while a user has Premium. It is never granted by hand.
export const PREMIUM_BADGE: BadgeInfo = {
  slug: 'premium',
  label: 'Premium',
  description: 'Has an active premium plan',
  icon: 'gem',
  tone: 'amber',
};

export function isPremiumActive(until: string | null | undefined): boolean {
  return Boolean(until) && new Date(until as string).getTime() > Date.now();
}

export function describePremium(until: string): string {
  const date = new Date(until);
  if (date.getUTCFullYear() >= 9999) return 'Lifetime';
  return `Expires ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
