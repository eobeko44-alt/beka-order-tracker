import { MessageSquareQuote, Quote, ShieldCheck } from 'lucide-react';
import StarRating from '@/components/reviews/StarRating';
import type { PublicReviews } from '@/types';

const MONTHS_FORMAT = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' });

export default function Testimonials({ data }: { data: PublicReviews }) {
  const { reviews, total, average } = data;

  return (
    <section id="reviews" className="relative mx-auto max-w-6xl scroll-mt-20 px-3 pb-14 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-40 w-2/3 rounded-full bg-brand-600/10 blur-[5rem]" />

      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs font-bold text-electric-300">
            <ShieldCheck className="h-4 w-4" />
            تجارب حقيقية من عملائنا
          </span>
          <h2 className="text-xl font-extrabold text-zinc-50 sm:text-2xl">آراء عملائنا</h2>
          <p className="text-sm text-zinc-400">ناس شحنوا ألعابهم معانا وقالوا رأيهم</p>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-4 self-start rounded-2xl border border-brand-500/25 bg-surface px-5 py-3 sm:self-auto">
            <span dir="ltr" className="text-3xl font-extrabold text-zinc-50">{average.toFixed(1)}</span>
            <div className="flex flex-col gap-1">
              <StarRating value={average} />
              <span className="text-xs text-zinc-400">من {total.toLocaleString('ar')} تقييم</span>
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="relative flex flex-col items-center gap-3 rounded-3xl border border-dashed border-brand-500/30 bg-surface/60 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
            <MessageSquareQuote className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-300">آراء عملائنا بتظهر هنا قريب.</p>
          <p className="text-xs text-zinc-500">شحنت معانا؟ قيّم طلبك من صفحة «طلباتي».</p>
        </div>
      ) : (
        <ul className="relative -mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="flex w-[82%] shrink-0 snap-center flex-col gap-4 rounded-3xl border border-brand-500/20 bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 hover:border-brand-400/50 sm:w-auto"
            >
              <div className="flex items-center justify-between">
                <StarRating value={review.rating} />
                <Quote className="h-6 w-6 text-brand-500/40" />
              </div>
              <p className="flex-1 text-sm leading-relaxed text-zinc-200">{review.comment}</p>
              <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-electric-500 text-sm font-extrabold text-white">
                  {review.customerName.trim().charAt(0)}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold text-zinc-50">{review.customerName}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {review.gameName ? `شحن ${review.gameName} · ` : ''}
                    {MONTHS_FORMAT.format(new Date(review.createdAt))}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
