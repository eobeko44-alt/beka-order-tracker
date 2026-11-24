import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
  Wallet,
  XCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { formatDateTime } from '@/lib/wallet';
import {
  fetchAllWithdrawRequests,
  updateWithdrawStatusAndBalance,
  type WithdrawRequestItem,
} from '@/lib/withdrawals';

export default function AdminWithdrawalsTab() {
  const [requests, setRequests] = useState<WithdrawRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllWithdrawRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل طلبات السحب');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function handleAction(item: WithdrawRequestItem, nextStatus: 'تم التحويل' | 'مرفوض') {
    setBusyId(item.id);
    setError(null);
    try {
      await updateWithdrawStatusAndBalance({ request: item, nextStatus });
      setRequests((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: nextStatus } : row)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الطلب');
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'قيد المراجعة').length;

  return (
    <div className="flex flex-col gap-4 text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-zinc-50">طلبات السحب</h2>
            <p className="text-xs text-zinc-400">
              مراجعة طلبات السحب واعتماد التحويل مع خصم الرصيد تلقائياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            قيد المراجعة: {pendingCount}
          </span>
          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
          {error}
        </div>
      )}

      {loading && requests.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center text-sm text-zinc-400">
          جاري تحميل طلبات السحب...
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          لا توجد طلبات سحب حالياً
        </div>
      )}

      {requests.length > 0 && (
        <div className="flex flex-col gap-3">
          {requests.map((item) => {
            const isPending = item.status === 'قيد المراجعة';
            const isApproved = item.status === 'تم التحويل';
            const isRejected = item.status === 'مرفوض';
            const isRowBusy = busyId === item.id;

            const statusBadge = isApproved
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : isRejected
                ? 'border-red-500/30 bg-red-500/15 text-red-300'
                : 'border-amber-500/30 bg-amber-500/15 text-amber-300';

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
                      <Wallet className="h-4 w-4" />
                    </span>
                    <span dir="ltr" className="text-base font-extrabold text-zinc-50">
                      {formatPrice(Number(item.amount))}
                    </span>
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                      {item.method}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      {item.user_name || 'مستخدم'} · {item.account_name}
                    </span>
                    <span dir="ltr" className="font-mono text-zinc-400">
                      {item.account_number}
                    </span>
                    {item.created_at && (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(item.created_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!isPending || isRowBusy}
                    onClick={() => void handleAction(item, 'تم التحويل')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تأكيد التحويل وخصم الرصيد</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isPending || isRowBusy}
                    onClick={() => void handleAction(item, 'مرفوض')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-extrabold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
