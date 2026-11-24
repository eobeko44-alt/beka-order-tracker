import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { getWithdrawStorageKey, type WithdrawRecord } from '@/components/wallet/WithdrawModal';

interface WithdrawHistoryProps {
  userId?: string;
}

export default function WithdrawHistory({ userId }: WithdrawHistoryProps) {
  const [records, setRecords] = useState<WithdrawRecord[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(getWithdrawStorageKey(userId));
      setRecords(raw ? (JSON.parse(raw) as WithdrawRecord[]) : []);
    } catch {
      setRecords([]);
    }
  }, [userId]);

  if (records.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ArrowUpRight className="h-4 w-4 text-brand-400" />
        <h3 className="text-base font-extrabold text-zinc-100">طلبات السحب</h3>
      </div>

      <div className="flex flex-col gap-3">
        {records.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 text-zinc-100"
          >
            <div className="flex items-center justify-between gap-2">
              <span dir="ltr" className="text-lg font-extrabold text-zinc-50">
                {formatPrice(item.amount)}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                {item.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <span>
                {item.method} · {item.accountName} ({item.accountNumber})
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.createdAt}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
