import { useState, type FormEvent } from 'react';
import { Loader2, Send } from 'lucide-react';
import StarRating from '@/components/reviews/StarRating';
import { REVIEW_COMMENT_MAX, describeReviewError, submitReview, validateReview } from '@/lib/reviews';

interface ReviewFormProps {
  orderId: string;
  onSubmitted: () => void;
  onCancel: () => void;
}

export default function ReviewForm({ orderId, onSubmitted, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateReview(rating, comment);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitReview(orderId, rating, comment);
      onSubmitted();
    } catch (err) {
      setError(describeReviewError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-brand-500/25 bg-brand-500/5 p-4">
      <span className="text-sm font-bold text-zinc-100">كيف كانت تجربتك؟</span>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={REVIEW_COMMENT_MAX}
        rows={3}
        placeholder="اكتب رأيك في الخدمة والسرعة..."
        aria-label="رأيك"
        className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
      />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          إرسال التقييم
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-100">
          إلغاء
        </button>
      </div>
    </form>
  );
}
