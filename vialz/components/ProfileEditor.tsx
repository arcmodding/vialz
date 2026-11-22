'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveProfile, type FormState } from '@/app/actions';

type Link = { id?: string; label: string; url: string };
type ProfileFields = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  music_url: string | null;
  accent: string;
  background: string;
  font: string;
  effect: string;
};

const initial: FormState = {};
const labelClass = 'block space-y-1.5';
const hintClass = 'text-sm text-white/60';

export default function ProfileEditor({
  profile,
  links: initialLinks,
  premium,
}: {
  profile: ProfileFields;
  links: Link[];
  premium: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initial);
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const maxLinks = premium ? 30 : 10;

  // After a save, the server sends back saved links with their ids. Use them so the next save does not duplicate.
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const updateLink = (index: number, key: keyof Link, value: string) =>
    setLinks((list) => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-2">
      <section className="glass space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Profile</h2>
        <label className={labelClass}>
          <span className={hintClass}>Display name</span>
          <input name="display_name" defaultValue={profile.display_name ?? ''} maxLength={40} className="field" />
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Bio</span>
          <textarea name="bio" defaultValue={profile.bio ?? ''} maxLength={280} rows={3} className="field resize-none" />
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Avatar image URL</span>
          <input name="avatar_url" type="url" defaultValue={profile.avatar_url ?? ''} placeholder="https://" className="field" />
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Banner image URL</span>
          <input name="banner_url" type="url" defaultValue={profile.banner_url ?? ''} placeholder="https://" className="field" />
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Music file URL (.mp3 or .ogg)</span>
          <input name="music_url" type="url" defaultValue={profile.music_url ?? ''} placeholder="https://" className="field" />
        </label>
      </section>

      <section className="glass space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Style</h2>
        <label className={labelClass}>
          <span className={hintClass}>Accent color</span>
          <input name="accent" type="color" defaultValue={profile.accent} className="h-11 w-20 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Background</span>
          <select name="background" defaultValue={profile.background} className="field">
            <option value="midnight">Midnight</option>
            <option value="ember">Ember</option>
            <option value="dusk">Dusk</option>
            <option value="void">Void</option>
          </select>
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Typeface</span>
          <select name="font" defaultValue={profile.font} className="field">
            <option value="sans">Modern</option>
            <option value="serif">Editorial</option>
            <option value="mono">Technical</option>
          </select>
        </label>
        <label className={labelClass}>
          <span className={hintClass}>Effect</span>
          <select name="effect" defaultValue={profile.effect} className="field">
            <option value="grain">Film grain</option>
            <option value="glow" disabled={!premium}>{premium ? 'Animated glow' : 'Animated glow (Premium)'}</option>
            <option value="none">None</option>
          </select>
        </label>
      </section>

      <section className="glass space-y-4 p-6 sm:p-8 lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl">Links</h2>
          <button
            type="button"
            className="btn-ghost !py-2"
            disabled={links.length >= maxLinks}
            onClick={() => setLinks((list) => [...list, { label: '', url: 'https://' }])}
          >
            Add link
          </button>
        </div>
        {links.length === 0 && <p className="text-sm text-white/45">No links yet. Add your first one.</p>}
        <p className="text-sm text-white/45">
          {premium ? 'Premium: up to 30 links.' : 'Free: up to 10 links. Premium unlocks 30.'}
        </p>
        {links.map((link, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <input aria-label="Link label" placeholder="Label" maxLength={30} value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} className="field" />
            <input aria-label="Link URL" placeholder="https://" value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} className="field" />
            <button type="button" className="btn-ghost" onClick={() => setLinks((list) => list.filter((_, idx) => idx !== i))}>
              Remove
            </button>
          </div>
        ))}
        <input type="hidden" name="links" value={JSON.stringify(links)} />
      </section>

      <div className="flex items-center justify-end gap-4 lg:col-span-2">
        {state.error && <p role="alert" className="mr-auto text-sm text-red-300">{state.error}</p>}
        {state.notice && <p role="status" className="mr-auto text-sm text-[#9be7ff]">{state.notice}</p>}
        <button disabled={pending} className="btn-primary">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
