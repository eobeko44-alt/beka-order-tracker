import { useEffect, useState } from 'react';
import { ArrowDownLeft, ChevronDown, ChevronUp, Clock, Wallet } from 'lucide-react';
import { fetchTopUps } from '@/lib/topups';
import {
  TOP_UP_METHOD_LABELS,
  TOP_UP_STATUS_LABELS,
  TOP_UP_STATUS_STYLES,
  formatDateTime,
} from '@/lib/wallet';
import { formatPrice } from '@/lib/format';
import type { TopUpRequest } from '@/types';

const INITIAL_VISIBLE = 1;

export default function TopUpHistory() {
  const [items, setItems] = useState<TopUpRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTopUps()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!error && items !== null && items.length === 0) return null;

  const visibleItems = items ? (showAll ? items : items.slice(0, INITIAL_VISIBLE)) : [];
  const hasMore = Boolean(items && items.length > INITIAL_VISIBLE);

  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/85 p-3.5 text-zinc-100 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
            <ArrowDownLeft className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-extrabold text-zinc-100 sm:text-base">طلبات الشحن</h3>
          {items && items.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
              {items.length}
            </span>
          )}
        </div>

        {hasMore && items && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-brand-300 transition hover:bg-zinc-800"
          >
            <span>{showAll ? 'إخفاء' : `عرض الكل (${items.length})`}</span>
            {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          تعذر تحميل طلبات الشحن، حاول مرة أخرى لاحقاً.
        </p>
      )}

      {!error && items === null && (
        <p className="py-2 text-center text-xs text-zinc-400">جاري تحميل الطلبات...</p>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-950/90 px-3 py-2.5 transition-colors hover:border-zinc-700"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
                  <Wallet className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="text-sm font-extrabold text-zinc-50">
                      {formatPrice(item.amount)}
                    </span>
                    <span className="rounded bg-brand-600/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-300">
                      {TOP_UP_METHOD_LABELS[item.method]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400">
                    <span className="truncate">رقم العملية {item.transactionNumber}</span>
                    <span className="inline-flex items-center gap-1 text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${TOP_UP_STATUS_STYLES[item.status]}`}
              >
                {TOP_UP_STATUS_LABELS[item.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
