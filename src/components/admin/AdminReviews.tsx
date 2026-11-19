import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { AdminLoading, AdminNotice } from '@/components/admin/AdminPaymentMethods';
import StarRating from '@/components/reviews/StarRating';
import { useAsyncData } from '@/hooks/useAsyncData';
import { catalogQueryOptions } from '@/lib/catalog';
import {
  REVIEW_COMMENT_MAX,
  REVIEW_NAME_MAX,
  createOwnerReview,
  deleteReview,
  fetchAllReviews,
  setReviewStatus,
  validateReview,
  validateReviewerName,
} from '@/lib/reviews';
import { formatDateTime } from '@/lib/wallet';
import type { AdminReview, ReviewStatus } from '@/types';

const STATUS: Record<ReviewStatus, { label: string; style: string }> = {
  pending: { label: 'بانتظار الموافقة', style: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  approved: { label: 'منشور', style: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  rejected: { label: 'مخفي', style: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' },
};

const INPUT =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

export default function AdminReviews() {
  const { data, error, reload } = useAsyncData(fetchAllReviews);

  return (
    <div className="flex flex-col gap-6">
      <AddReviewForm onAdded={reload} />
      {error ? (
        <AdminNotice text="تعذر تحميل التقييمات، حاول مرة أخرى." onRetry={reload} />
      ) : !data ? (
        <AdminLoading />
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">لا توجد تقييمات بعد</p>
      ) : (
        <ReviewGroups reviews={data} onChanged={reload} />
      )}
    </div>
  );
}

function ReviewGroups({ reviews, onChanged }: { reviews: AdminReview[]; onChanged: () => void }) {
  const pending = reviews.filter((r) => r.status === 'pending');
  const rest = reviews.filter((r) => r.status !== 'pending');
  return (
    <>
      {pending.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-zinc-300">بانتظار الموافقة ({pending.length})</h3>
          <ul className="flex flex-col gap-4">
            {pending.map((r) => <ReviewRow key={r.id} review={r} onChanged={onChanged} />)}
          </ul>
        </div>
      )}
      {rest.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-zinc-500">كل التقييمات ({rest.length})</h3>
          <ul className="flex flex-col gap-4">
            {rest.map((r) => <ReviewRow key={r.id} review={r} onChanged={onChanged} />)}
          </ul>
        </div>
      )}
    </>
  );
}

function ReviewRow({ review, onChanged }: { review: AdminReview; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const status = STATUS[review.status];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      onChanged();
    } catch {
      setMessage('تعذر تنفيذ العملية، حاول مرة أخرى.');
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-zinc-50">{review.customerName}</span>
          <span className="text-xs text-zinc-500">
            {review.source === 'owner' ? 'أضفته من اللوحة' : 'من عميل بعد طلب مكتمل'}
            {review.gameName ? ` · ${review.gameName}` : ''} · {formatDateTime(review.createdAt)}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${status.style}`}>{status.label}</span>
      </div>
      <StarRating value={review.rating} />
      <p className="text-sm leading-relaxed text-zinc-200">{review.comment}</p>
      {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
      <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
        {review.status !== 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setReviewStatus(review.id, 'approved'))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            نشر
          </button>
        )}
        {review.status !== 'rejected' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setReviewStatus(review.id, 'rejected'))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
          >
            <EyeOff className="h-4 w-4" />
            إخفاء
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('متأكد إنك عايز تحذف التقييم ده نهائياً؟')) void run(() => deleteReview(review.id));
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          حذف
        </button>
      </div>
    </li>
  );
}

function AddReviewForm({ onAdded }: { onAdded: () => void }) {
  const { data: catalog } = useQuery(catalogQueryOptions);
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateReviewerName(name) ?? validateReview(rating, comment);
    if (problem) {
      setMessage({ ok: false, text: problem });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await createOwnerReview({ customerName: name, gameId: gameId || null, rating, comment });
      setName('');
      setGameId('');
      setRating(5);
      setComment('');
      setMessage({ ok: true, text: 'اتنشر التقييم في الصفحة الرئيسية.' });
      onAdded();
    } catch {
      setMessage({ ok: false, text: 'تعذر حفظ التقييم، حاول مرة أخرى.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-brand-500/25 bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-zinc-50">إضافة رأي عميل</h3>
        <p className="text-xs text-zinc-400">انقل رأي عميل حقيقي (من واتساب مثلاً). بيتنشر طوالي.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={REVIEW_NAME_MAX}
          placeholder="اسم العميل"
          aria-label="اسم العميل"
          className={INPUT}
        />
        <select value={gameId} onChange={(e) => setGameId(e.target.value)} aria-label="اللعبة" className={INPUT}>
          <option value="">بدون لعبة</option>
          {(catalog?.games ?? []).map((game) => (
            <option key={game.id} value={game.id}>{game.name_ar}</option>
          ))}
        </select>
      </div>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={REVIEW_COMMENT_MAX}
        rows={3}
        placeholder="رأي العميل..."
        aria-label="رأي العميل"
        className={`${INPUT} resize-none`}
      />
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        نشر التقييم
      </button>
    </form>
  );
}
