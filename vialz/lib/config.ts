// Keep RESERVED_USERNAMES in sync with the trigger in supabase/schema.sql.
export const RESERVED_USERNAMES = [
  'admin', 'api', 'auth', 'dashboard', 'login', 'signup', 'settings', 'support', 'vialz', 'root',
];

export const BACKGROUND_KEYS = ['midnight', 'ember', 'dusk', 'void'] as const;
export const FONT_KEYS = ['sans', 'serif', 'mono'] as const;
export const EFFECT_KEYS = ['none', 'grain', 'glow'] as const;

export const BACKGROUND_CLASS: Record<(typeof BACKGROUND_KEYS)[number], string> = {
  midnight: 'bg-[radial-gradient(ellipse_at_top,#16233f_0%,#07080b_60%)]',
  ember: 'bg-[radial-gradient(ellipse_at_top,#3b1d12_0%,#07080b_60%)]',
  dusk: 'bg-[linear-gradient(170deg,#1d1233_0%,#07080b_70%)]',
  void: 'bg-[#07080b]',
};

export const FONT_VAR: Record<(typeof FONT_KEYS)[number], string> = {
  sans: 'var(--font-body)',
  serif: 'var(--font-display)',
  mono: 'var(--font-mono)',
};

export const GRAIN_IMAGE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;
