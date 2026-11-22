'use client';

import { useActionState } from 'react';
import { redeemCode, type FormState } from '@/app/actions';

const initial: FormState = {};

export default function RedeemCode() {
  const [state, formAction, pending] = useActionState(redeemCode, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="code"
        placeholder="VIALZ-XXXX-XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
        aria-label="Premium code"
        className="field font-mono uppercase tracking-wider"
      />
      <button disabled={pending} className="btn-primary sm:w-auto">
        {pending ? 'Checking…' : 'Redeem'}
      </button>
      {state.error && <p role="alert" className="text-sm text-red-300 sm:basis-full">{state.error}</p>}
      {state.notice && <p role="status" className="text-sm text-[#9be7ff] sm:basis-full">{state.notice}</p>}
    </form>
  );
}
