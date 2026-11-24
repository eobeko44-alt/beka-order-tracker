import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Phone, XCircle } from 'lucide-react';
import { AdminLoading, AdminNotice } from '@/components/admin/AdminPaymentMethods';
import { useAsyncData } from '@/hooks/useAsyncData';
import { formatDateTime } from '@/lib/wallet';
import {
  fetchPhoneLoginRequests,
  isRequestOpen,
  reviewPhoneLogin,
  type PhoneLoginRequest,
  type PhoneLoginRequestStatus,
} from '@/lib/phoneLoginRequests';

const STATUS_LABELS: Record<PhoneLoginRequestStatus | 'expired', string> = {
  pending: 'بانتظار التأكيد',
  approved: 'تمت الموافقة',
  used: 'دخل بنجاح',
  rejected: 'مرفوض',
  expired: 'منتهي',
};

const STATUS_STYLES: Record<PhoneLoginRequestStatus | 'expired', string> = {
  pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  approved: 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
  used: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-300 ring-red-500/30',
  expired: 'bg-zinc-800 text-zinc-400 ring-zinc-700',
};

export default function AdminPhoneLogins() {
  const { data, error, reload } = useAsyncData(fetchPhoneLoginRequests);
  const [live, setLive] = useState<PhoneLoginRequest[] | null>(null);

  useEffect(() => {
    if (data) setLive(data);
  }, [data]);

  // Refresh quietly so new WhatsApp requests show up without reloading the page.
  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchPhoneLoginRequests().then(setLive).catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const list = live ?? data;
  if (error && !list) return <AdminNotice text="تعذر تحميل طلبات الدخول. حاول مرة أخرى." onRetry={reload} />;
  if (!list) return <AdminLoading />;

  const now = Date.now();
  const open = list.filter((r) => isRequestOpen(r, now));
  const others = list.filter((r) => !isRequestOpen(r, now));

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm leading-relaxed text-zinc-300">
        لما عميل يرسل ليك رسالة دخول على واتساب، قارن <strong className="text-zinc-100">الرقم اللي الرسالة جات منه</strong> و
        <strong className="text-zinc-100">الرمز</strong> مع الطلب هنا، وافق فقط لو الاتنين متطابقين.
      </p>

      {open.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">ما في طلبات دخول جديدة الآن.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-glow-pulse" />
            <h3 className="text-sm font-bold text-zinc-300">بانتظار التأكيد ({open.length})</h3>
          </div>
          <ul className="flex flex-col gap-4">
            {open.map((item) => (
              <RequestRow key={item.id} item={item} onReviewed={reload} />
            ))}
          </ul>
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-zinc-500">السابقة ({others.length})</h3>
          <ul className="flex flex-col gap-3">
            {others.map((item) => (
              <RequestRow key={item.id} item={item} onReviewed={reload} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RequestRow({ item, onReviewed }: { item: PhoneLoginRequest; onReviewed: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isOpen = isRequestOpen(item);
  const statusKey = item.status === 'pending' && !isOpen ? 'expired' : item.status;
  const chatUrl = `https://wa.me/249${item.phone.slice(1)}`;

  async function handleReview(approve: boolean) {
    setBusy(approve ? 'approve' : 'reject');
    setMessage(null);
    try {
      await reviewPhoneLogin(item.id, approve);
      onReviewed();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : JSON.stringify(err));
      setBusy(null);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <Phone className="h-4 w-4" />
            <span dir="ltr" className="text-lg font-extrabold text-zinc-50">{item.phone}</span>
          </span>
          <span className="text-xs text-zinc-400">
            الرمز: <span dir="ltr" className="text-base font-extrabold tracking-[0.25em] text-brand-200">{item.code}</span>
          </span>
          <span className="text-xs text-zinc-500">{formatDateTime(item.createdAt)}</span>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[statusKey]}`}>
          {STATUS_LABELS[statusKey]}
        </span>
      </div>

      {message && <p role="alert" className="text-sm text-red-400">{message}</p>}

      {isOpen && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => void handleReview(true)}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            موافقة – دخول العميل
          </button>
          <button
            type="button"
            onClick={() => void handleReview(false)}
            disabled={busy !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            رفض
          </button>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
          >
            <MessageCircle className="h-4 w-4" />
            محادثة العميل
          </a>
        </div>
      )}
    </li>
  );
}
