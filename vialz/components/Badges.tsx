import type { BadgeInfo } from '@/lib/types';

const TONES: Record<string, string> = {
  blue: 'border-sky-300/25 bg-sky-300/10 text-sky-200',
  amber: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
  gold: 'border-yellow-300/25 bg-yellow-300/10 text-yellow-200',
  violet: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
  green: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
  rose: 'border-rose-300/25 bg-rose-300/10 text-rose-200',
};

const ICONS: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z',
  gem: 'M6 4h12l4 6-10 11L2 10l4-6zM2 10h20',
};

export default function Badges({ badges }: { badges: BadgeInfo[] }) {
  if (badges.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Badges">
      {badges.map((b) => (
        <li
          key={b.slug}
          title={b.description}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${TONES[b.tone] ?? TONES.blue}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 fill-none stroke-current"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={ICONS[b.icon] ?? ICONS.check} />
          </svg>
          {b.label}
        </li>
      ))}
    </ul>
  );
}
