'use client';

import { useActionState, useState } from 'react';
import { createPremiumCode, type CodeState } from '@/app/actions';

const initial: CodeState = {};

export default function CodeGenerator() {
  const [state, formAction, pending] = useActionState(createPremiumCode, initial);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state.code) return;
    await navigator.clipboard.writeText(state.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <form action={formAction} className="glass grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
      <h2 className="font-display text-3xl sm:col-span-2">Generate a code</h2>

      <label className="block space-y-1.5">
        <span className="text-sm text-white/60">Label</span>
        <input name="label" required maxLength={60} placeholder="Giveaway, June" className="field" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-white/60">Duration</span>
        <select name="duration" defaultValue="30" className="field">
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
          <option value="lifetime">Lifetime</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-white/60">Uses</span>
        <input name="max_uses" type="number" min={1} max={1000} defaultValue={1} required className="field" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-white/60">Expires on (optional)</span>
        <input name="expires_at" type="date" className="field" />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
        <div className="min-w-0">
          {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
          {state.code && (
            <div>
              <p className="text-sm text-white/55">Copy this now. For security, it won&apos;t be shown again.</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="font-mono text-xl tracking-wider text-[#9be7ff]">{state.code}</code>
                <button type="button" onClick={copy} className="btn-ghost !py-1.5 text-xs">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
        <button disabled={pending} className="btn-primary">
          {pending ? 'Generating…' : 'Generate code'}
        </button>
      </div>
    </form>
  );
}
