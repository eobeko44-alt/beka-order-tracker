import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Clock, Loader2, MessageCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { completePhoneLogin } from '@/lib/auth';
import { describeAuthError } from '@/lib/authErrors';
import { normalizeLocalPhone } from '@/lib/phone';
import { buildWhatsAppUrl } from '@/lib/format';
import { buildPhoneLoginMessage } from '@/lib/phonelogin';
import { checkPhoneLogin, startPhoneLogin } from '@/lib/phoneLogin.functions';
import { STORE_CONTACT_DISPLAY } from '@/lib/config';

interface PhoneSignInProps {
  onBack: () => void;
}

interface PendingLogin {
  requestId: string;
  phone: string;
  code: string;
  expiresAt: string;
}

const STORAGE_KEY = 'beka-phone-login';
const POLL_MS = 4000;

function loadPending(): PendingLogin | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLogin;
    const expTime = new Date(parsed.expiresAt).getTime();
    if (!parsed.requestId || !parsed.code || !Number.isFinite(expTime) || expTime <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePending(value: PendingLogin | null) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked in private mode; the flow still works on this page.
  }
}

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function PhoneSignIn({ onBack }: PhoneSignInProps) {
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState<PendingLogin | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pollingRef = useRef(false);

  // Restore a request after the customer comes back from WhatsApp.
  useEffect(() => {
    const saved = loadPending();
    if (saved) {
      setPending(saved);
      setPhone(saved.phone);
    }
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  // Wait for the store to approve the request, then sign in.
  useEffect(() => {
    if (!pending) return;
    let active = true;

    async function poll() {
      if (!active || pollingRef.current || !pending) return;
      pollingRef.current = true;
      try {
        const result = await checkPhoneLogin({ data: { requestId: pending.requestId } });
        if (!active) return;
        if (result.status === 'approved' && result.tokenHash) {
          setIsSigningIn(true);
          await completePhoneLogin(result.tokenHash);
          savePending(null);
        } else if (result.status === 'rejected') {
          savePending(null);
          setPending(null);
          setError('الإدارة رفضت طلب الدخول. تأكد أنك أرسلت الرسالة من نفس الرقم وجرّب ثاني.');
        } else if (result.status === 'expired') {
          savePending(null);
          setPending(null);
          setError('انتهت صلاحية الرمز. اطلب رمز جديد.');
        }
      } catch (err) {
        if (active) {
          setIsSigningIn(false);
          setError(describeAuthError(err));
        }
      } finally {
        pollingRef.current = false;
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [pending]);

  async function handleStart(event: FormEvent) {
    event.preventDefault();
    const local = normalizeLocalPhone(phone);
    if (!local) {
      setError('أدخل رقم هاتف سوداني صحيح (مثال: 0912345678).');
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const result = await startPhoneLogin({ data: { phone: local } });
      if (!result || !result.ok) {
        setError(result?.error ?? 'تعذر إنشاء رمز التحقق.');
        return;
      }

      const next: PendingLogin = {
        requestId: result.requestId,
        phone: result.phone,
        code: result.code,
        expiresAt: result.expiresAt,
      };
      savePending(next);
      setPending(next);
      setNow(Date.now());
    } catch (err) {
      const detail = err instanceof Error ? err.message : JSON.stringify(err);
      setError(`${describeAuthError(err)} - ${detail}`);
    } finally {
      setIsBusy(false);
    }
  }

  function handleRestart() {
    savePending(null);
    setPending(null);
    setIsSigningIn(false);
    setError(null);
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none';

  if (pending) {
    const remaining = new Date(pending.expiresAt).getTime() - now;
    const whatsappUrl = buildWhatsAppUrl(buildPhoneLoginMessage(pending.phone, pending.code));

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
          <span className="text-xs font-semibold text-zinc-300">رمز التحقق الخاص بك</span>
          <span
            dir="ltr"
            className="text-4xl font-extrabold tracking-[0.35em] text-brand-200"
            aria-label="رمز التحقق"
          >
            {pending.code}
          </span>
          <span dir="ltr" className="text-sm text-zinc-400">
            {pending.phone}
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              صالح لمدة <span dir="ltr">{formatRemaining(remaining)}</span>
            </span>
          </span>
        </div>

        <ol className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-300">
          <li>1. اضغط الزر أدناه ليفتح لك واتساب برسالة جاهزة فيها رقمك والرمز.</li>
          <li>
            2. أرسل الرسالة كما هي <strong className="text-zinc-100">من نفس الرقم</strong> الذي كتبته.
          </li>
          <li>3. بعد ما الإدارة تأكد الرمز سيتم دخولك هنا تلقائياً.</li>
        </ol>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-3.5 text-sm font-bold text-white transition hover:bg-whatsapp-hover"
        >
          <MessageCircle className="h-5 w-5" />
          أرسل الرمز للإدارة على واتساب
        </a>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400" role="status">
          {isSigningIn ? (
            <>
              <ShieldCheck className="h-4 w-4 text-whatsapp-hover" />
              <span>تم التأكيد، جاري تسجيل دخولك...</span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>في انتظار تأكيد الإدارة...</span>
            </>
          )}
        </div>

        <p className="text-center text-xs text-zinc-500">
          رقم الإدارة على واتساب: <span dir="ltr">{STORE_CONTACT_DISPLAY}</span>
        </p>

        {error && (
          <p role="alert" className="text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleRestart}
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <RefreshCw className="h-4 w-4" />
          غيّر الرقم أو اطلب رمز جديد
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleStart} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-zinc-200">رقم الهاتف (واتساب)</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            dir="ltr"
            autoComplete="tel-national"
            placeholder="0912345678"
            className={inputClass}
          />
        </label>

        <p className="text-xs leading-relaxed text-zinc-500">
          سنطلع لك رمز تحقق وترسله لينا على واتساب من نفس الرقم عشان نأكد إنه رقمك. ما في رسائل SMS.
        </p>

        <button
          type="submit"
          disabled={isBusy || !phone.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          أنشئ رمز التحقق
        </button>
      </form>

      {error && (
        <p role="alert" className="text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع إلى الخيارات
      </button>
    </div>
  );
}
