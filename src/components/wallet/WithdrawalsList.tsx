import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp, Clock, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { getWithdrawStorageKey, type WithdrawRecord } from '@/components/wallet/WithdrawModal';

interface WithdrawalsListProps {
  userId: string;
}

const INITIAL_VISIBLE = 3;

export default function WithdrawalsList({ userId }: WithdrawalsListProps) {
  const [items, setItems] = useState<WithdrawRecord[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWithdrawals() {
      const localMap = new Map<string, WithdrawRecord>();

      try {
        const raw = window.localStorage.getItem(getWithdrawStorageKey(userId));
        const localRows: WithdrawRecord[] = raw ? (JSON.parse(raw) as WithdrawRecord[]) : [];
        for (const row of localRows) {
          localMap.set(row.id, row);
        }
      } catch {
        // تجاهل خطأ التخزين المحلي
      }

      try {
        const { data, error } = await supabase
          .from('withdraw_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const dbRows: WithdrawRecord[] = data.map((row) => ({
            id: String(row.id),
            amount: Number(row.amount ?? 0),
            method: (row.method ?? 'ماي كاشي') as WithdrawRecord['method'],
            accountName: String(row.account_name ?? ''),
            accountNumber: String(row.account_number ?? ''),
            status: 'قيد المراجعة',
            createdAt: row.created_at
              ? new Date(String(row.created_at)).toLocaleString('ar-SD', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
          }));

          for (const dbItem of dbRows) {
            localMap.set(dbItem.id, dbItem);
          }
        }
      } catch {
        // نكتفي بالمحلي إذا لم يتوفر جدول السحب بعد
      }

      if (active) {
        setItems(Array.from(localMap.values()));
      }
    }

    void loadWithdrawals();
    return () => {
      active = false;
    };
  }, [userId]);

  if (items.length === 0) return null;

  const visibleItems = showAll ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > INITIAL_VISIBLE;

  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/85 p-3.5 text-zinc-100 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-extrabold text-zinc-100 sm:text-base">القروش المسحوبة</h3>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
            {items.length}
          </span>
        </div>

        {hasMore && (
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

      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-950/90 px-3 py-2.5"
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
                    {item.method}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400">
                  <span className="truncate">
                    {item.accountName} · {item.accountNumber}
                  </span>
                  {item.createdAt && (
                    <span className="inline-flex items-center gap-1 text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {item.createdAt}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
