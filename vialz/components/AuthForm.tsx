'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signIn, signUp, type FormState } from '@/app/actions';

const initial: FormState = {};

export default function AuthForm({ mode, defaultUsername = '' }: { mode: 'login' | 'signup'; defaultUsername?: string }) {
  const isLogin = mode === 'login';
  const [state, formAction, pending] = useActionState(isLogin ? signIn : signUp, initial);

  return (
    <main className="grid min-h-[80vh] place-items-center px-5 py-16">
      <div className="glass w-full max-w-md p-8 animate-rise">
        <h1 className="font-display text-4xl">{isLogin ? 'Welcome back' : 'Create your profile'}</h1>
        <p className="mt-2 text-sm text-white/50">
          {isLogin ? 'Log in to edit your page.' : 'Your username becomes your link.'}
        </p>

        <form action={formAction} className="mt-8 space-y-4">
          {!isLogin && (
            <label className="block space-y-1.5">
              <span className="text-sm text-white/60">Username</span>
              <div className="field flex items-center">
                <span className="text-white/35">vialz.lol/</span>
                <input
                  name="username"
                  defaultValue={defaultUsername}
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  className="min-w-0 flex-1 bg-transparent pl-1 outline-none"
                />
              </div>
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm text-white/60">Email</span>
            <input name="email" type="email" required autoComplete="email" className="field" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-white/60">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="field"
            />
          </label>

          {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
          {state.notice && <p role="status" className="text-sm text-[#9be7ff]">{state.notice}</p>}

          <button disabled={pending} className="btn-primary w-full">
            {pending ? 'Working…' : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          {isLogin ? (
            <>New here? <Link href="/signup" className="text-white hover:underline">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link></>
          )}
        </p>
      </div>
    </main>
  );
}
