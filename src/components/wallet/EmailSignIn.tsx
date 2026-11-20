import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth';
import { describeAuthError } from '@/lib/authErrors';
import { supabase } from '@/integrations/supabase/client';

interface EmailSignInProps {
  onBack: () => void;
}

export default function EmailSignIn({ onBack }: EmailSignInProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleResetPassword() {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError('اكتب البريد الإلكتروني أولاً.');
      return;
    }

    setIsBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setNotice('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'forgot') {
      await handleResetPassword();
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور لازم تكون 6 حروف أو أرقام على الأقل.');
      return;
    }

    setIsBusy(true);
    try {
      if (mode === 'signup') {
        const signedIn = await signUpWithEmail(email.trim(), password, name.trim());
        if (!signedIn) {
          setNotice('بعتنا ليك رسالة تأكيد على إيميلك، افتحها واضغط على الرابط عشان تكمل.');
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-brand-500';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-950 p-1">
          {(['signin', 'signup'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError(null);
                setNotice(null);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                mode === item ? 'bg-brand-600 text-white' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {item === 'signin' ? 'تسجيل دخول' : 'حساب جديد'}
            </button>
          ))}
        </div>
      )}

      {mode === 'signup' && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-zinc-200">الاسم</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            className={inputClass}
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-zinc-200">البريد الإلكتروني</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          dir="ltr"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>

      {mode !== 'forgot' && (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-200">كلمة المرور</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              dir="ltr"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              className={inputClass}
            />
          </label>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError(null);
                setNotice(null);
              }}
              className="self-start text-xs font-semibold text-zinc-400 underline hover:text-zinc-200"
            >
              نسيت كلمة المرور؟
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-red-400">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-300">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white"
      >
        {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'forgot'
          ? 'إرسال رابط الاستعادة'
          : mode === 'signup'
            ? 'إنشاء حساب'
            : 'دخول'}
      </button>

      <button
        type="button"
        onClick={() => {
          if (mode === 'forgot') {
            setMode('signin');
            setError(null);
            setNotice(null);
          } else {
            onBack();
          }
        }}
        className="text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
      >
        {mode === 'forgot' ? 'رجوع إلى تسجيل الدخول' : 'رجوع إلى الخيارات'}
      </button>
    </form>
  );
}
