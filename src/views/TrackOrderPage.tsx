import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  PackageCheck,
  Search,
  SearchCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/format';
import { normalizeTrackQuery, trackOrders, type TrackStatus, type TrackedOrder } from '@/lib/orders';
import { formatDateTime } from '@/lib/wallet';

/** While any shown order is still under review, the page re-checks it this often. */
const REFRESH_MS = 20_000;

export const TRACK_STATUS: Record<TrackStatus, { label: string; hint: string; icon: LucideIcon; style: string }> = {
  pending: {
    label: 'قيد المراجعة',
    hint: 'استلمنا طلبك وبنراجع التحويل. الصفحة بتتحدث براها.',
    icon: Clock3,
    style: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  },
  completed: {
    label: 'تم الشحن',
    hint: 'تم شحن الباقة على حسابك. استمتع!',
    icon: CheckCircle2,
    style: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  },
  rejected: {
    label: 'مرفوض',
    hint: 'ما قدرنا نأكد الطلب. تواصل معانا على واتساب نوضح ليك السبب.',
    icon: XCircle,
    style: 'bg-red-500/15 text-red-300 ring-red-500/30',
  },
};

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; orders: TrackedOrder[]; checkedAt: Date };

export default function TrackOrderPage({ initialQuery }: { initialQuery: string }) {
  const navigate = useNavigate();
  const [input, setInput] = useState(initialQuery);
  const [state, setState] = useState<LookupState>({ kind: 'idle' });
  const requestId = useRef(0);

  async function lookup(query: string, silent = false) {
    const id = ++requestId.current;
    if (!silent) setState({ kind: 'loading' });
    try {
      const orders = await trackOrders(query);
      if (id === requestId.current) setState({ kind: 'done', orders, checkedAt: new Date() });
    } catch {
      if (id === requestId.current && !silent) setState({ kind: 'error' });
    }
  }

  // Search whatever is in the address bar (e.g. coming from the checkout screen).
  useEffect(() => {
    setInput(initialQuery);
    if (normalizeTrackQuery(initialQuery).length >= 3) void lookup(initialQuery);
    else setState({ kind: 'idle' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Live updates: re-check quietly while something is still under review.
  const hasPending = state.kind === 'done' && state.orders.some((order) => order.status === 'pending');
  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void lookup(initialQuery, true), REFRESH_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending, initialQuery]);

  const cleaned = normalizeTrackQuery(input);
  const tooShort = cleaned.length > 0 && cleaned.length < 3;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (cleaned.length < 3) return;
    if (cleaned === normalizeTrackQuery(initialQuery)) void lookup(cleaned);
    else void navigate({ to: '/track', search: { q: cleaned } });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
          <SearchCheck className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-extrabold text-zinc-50 sm:text-3xl">تتبع طلبك</h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          اكتب رقم الطلب أو ID اللاعب وشوف حالة طلبك فوراً — من غير ما تحتاج تراسلنا.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2" role="search">
        <label htmlFor="track-query" className="text-sm font-semibold text-zinc-300">
          رقم الطلب أو ID اللاعب
        </label>
        <div className="flex gap-2">
          <input
            id="track-query"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="مثلاً: 3F9A1C2B أو 5123456789"
            dir="ltr"
            inputMode="text"
            autoComplete="off"
            maxLength={60}
            className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-zinc-50 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            disabled={cleaned.length < 3 || state.kind === 'loading'}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            {state.kind === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            بحث
          </button>
        </div>
        {tooShort && <p className="text-xs text-amber-300">اكتب 3 حروف أو أرقام على الأقل.</p>}
      </form>

      {state.kind === 'error' && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          تعذر البحث الآن، تأكد من الإنترنت وحاول مرة أخرى.
        </p>
      )}

      {state.kind === 'done' && state.orders.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-sm leading-relaxed text-zinc-300">
            ما لقينا أي طلب بالرقم ده. اتأكد من رقم الطلب أو ID اللاعب وجرّب تاني.
          </p>
          <a
            href={buildWhatsAppUrl(`مرحباً، عايز أستفسر عن طلب: ${cleaned}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            <MessageCircle className="h-4 w-4" />
            تواصل معانا
          </a>
        </div>
      )}

      {state.kind === 'done' && state.orders.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500" aria-live="polite">
            {hasPending ? 'بنحدّث الحالة تلقائياً كل شوية · ' : ''}
            آخر تحديث: {state.checkedAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <ul className="flex flex-col gap-4">
            {state.orders.map((order) => (
              <TrackedOrderCard key={order.orderCode + order.createdAt} order={order} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const STEPS: { key: string; label: string }[] = [
  { key: 'received', label: 'استلمنا الطلب' },
  { key: 'review', label: 'قيد المراجعة' },
  { key: 'final', label: 'النتيجة' },
];

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  const info = TRACK_STATUS[order.status];
  const Icon = info.icon;
  const reached = order.status === 'pending' ? 2 : 3;
  const finalLabel = order.status === 'rejected' ? 'مرفوض' : 'تم الشحن';

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-zinc-50">{order.gameName}</span>
          <span className="text-sm text-zinc-400">{order.packageLabel}</span>
          <span className="text-xs text-zinc-500">
            رقم الطلب: <span dir="ltr" className="font-mono font-bold text-zinc-300">{order.orderCode}</span>
          </span>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${info.style}`}>
          <Icon className="h-3.5 w-3.5" />
          {info.label}
        </span>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label="مراحل الطلب">
        {STEPS.map((step, index) => {
          const done = index < reached;
          const isFinal = index === 2;
          const tone =
            done && isFinal && order.status === 'rejected'
              ? 'bg-red-500'
              : done && isFinal
                ? 'bg-emerald-500'
                : done
                  ? 'bg-brand-500'
                  : 'bg-zinc-700';
          return (
            <li key={step.key} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${tone} ${!done ? '' : index === reached - 1 && order.status === 'pending' ? 'animate-pulse' : ''}`} />
              <span className={`text-[11px] font-semibold ${done ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {isFinal ? (order.status === 'pending' ? 'تم الشحن' : finalLabel) : step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-sm leading-relaxed text-zinc-300">{info.hint}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-sm">
        <span className="text-zinc-400">
          الآيدي: <span dir="ltr" className="text-zinc-200">{order.playerId}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDateTime(order.createdAt)}
        </span>
        {order.reviewedAt && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <PackageCheck className="h-3.5 w-3.5" />
            {formatDateTime(order.reviewedAt)}
          </span>
        )}
      </div>

      {order.status === 'rejected' && (
        <a
          href={buildWhatsAppUrl(`مرحباً، طلبي رقم ${order.orderCode} ظهر مرفوض، ممكن توضحوا السبب؟`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
        >
          <MessageCircle className="h-4 w-4" />
          استفسر عن الطلب
        </a>
      )}
    </li>
  );
}
