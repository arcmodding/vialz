export type BadgeInfo = {
  slug: string;
  label: string;
  description: string;
  icon: string;
  tone: string;
  sort?: number;
};

export type ProfileRow = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  music_url: string | null;
  accent: string;
  background: string;
  font: string;
  effect: string;
  views: number;
  banned: boolean;
  premium_until: string | null;
  links: { id: string; label: string; url: string; position: number }[];
  profile_badges: { badges: BadgeInfo }[];
};

export type UserRow = {
  id: string;
  username: string;
  views: number;
  banned: boolean;
  is_admin: boolean;
  role: string;
  created_at: string;
  profile_badges: { badge_slug: string }[];
};

export type BadgeOption = { slug: string; label: string };

export type CodeRow = {
  id: string;
  label: string;
  duration_days: number | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

export type DailyRow = { day: string; views: number };

export type LinkStatsRow = {
  id: string;
  label: string;
  url: string;
  link_daily: { day: string; clicks: number }[];
};
