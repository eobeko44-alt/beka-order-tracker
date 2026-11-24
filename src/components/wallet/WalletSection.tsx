import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
} from 'lucide-react';
import WalletCard from '@/components/wallet/WalletCard';
import { getWithdrawStorageKey, type WithdrawRecord } from '@/components/wallet/WithdrawModal';
import { useAuth } from '@/hooks/useAuth';
import { fetchTopUps } from '@/lib/topups';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { TOP_UP_METHOD_LABELS, TOP_UP_STATUS_LABELS, formatDateTime } from '@/lib/wallet';
import type { TopUpRequest } from '@/types';

interface WalletHistoryEntry {
  id: string;
  kind: 'شحن' | 'سحب';
  amount: number;
  subtitle: string;
  status: string;
  timestamp: number;
  timeText: string;
  approved: boolean;
  rejected: boolean;
}

type HistoryFilter = 'all' | 'شحن' | 'سحب';

const INITIAL_VISIBLE = 1;

export default function WalletSection() {
  const { profile, isLoading, refreshProfile } = useAuth();
  const [historyVersion, setHistoryVersion] = useState(0);
  const [openWithdraw, setOpenWithdraw] = useState(false);
  const [entries, setEntries] = useState<WalletHistoryEntry[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#withdraw') {
      setOpenWithdraw(true);
    }

    const onHashChange = () => {
      if (window.location.hash === '#withdraw') {
        setOpenWithdraw(true);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAllHistory() {
      if (!profile?.id) {
        if (active) setEntries([]);
        return;
      }

      const merged: WalletHistoryEntry[] = [];

      // 1. طلبات الشحن
      try {
        const topUps: TopUpRequest[] = await fetchTopUps();
        for (const item of topUps) {
          const ts = item.createdAt ? new Date(item.createdAt).getTime() : 0;
          const statusLabel = TOP_UP_STATUS_LABELS[item.status] ?? String(item.status);
          merged.push({
            id: `topup-${item.id}`,
            kind: 'شحن',
            amount: Number(item.amount ?? 0),
            subtitle: `${TOP_UP_METHOD_LABELS[item.method] ?? item.method} · رقم العملية ${item.transactionNumber}`,
            status: statusLabel,
            timestamp: Number.isNaN(ts) ? 0 : ts,
            timeText: item.createdAt ? formatDateTime(item.createdAt) : '',
            approved:
              statusLabel.includes('موافق') ||
              statusLabel.includes('تم') ||
              String(item.status).toLowerCase().includes('approved'),
            rejected:
              statusLabel.includes('مرفوض') ||
              String(item.status).toLowerCase().includes('rejected'),
          });
        }
      } catch {
        // تجاهل خطأ جلب الشحن مؤقتاً
      }

      // 2. طلبات السحب (من قاعدة البيانات ثم التخزين المحلي)
      let loadedFromDb = false;
      try {
        const { data, error } = await supabase
          .from('withdraw_requests')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          loadedFromDb = true;
          for (const row of data) {
            const ts = row.created_at ? new Date(String(row.created_at)).getTime() : 0;
            const st = String(row.status ?? 'قيد المراجعة');
            merged.push({
              id: `wd-db-${row.id}`,
              kind: 'سحب',
              amount: Number(row.amount ?? 0),
              subtitle: `${row.method ?? 'سحب'} · ${row.account_number ?? ''}`,
              status: st,
              timestamp: Number.isNaN(ts) ? 0 : ts,
              timeText: row.created_at ? formatDateTime(String(row.created_at)) : '',
              approved: st.includes('تم') || st.includes('موافق'),
              rejected: st.includes('مرفوض'),
            });
          }
        }
      } catch {
        // نستخدم التخزين المحلي كبديل
      }

      if (!loadedFromDb) {
        try {
          const raw = window.localStorage.getItem(getWithdrawStorageKey(profile.id));
          const localRows: WithdrawRecord[] = raw ? (JSON.parse(raw) as WithdrawRecord[]) : [];
          for (const row of localRows) {
            merged.push({
              id: `wd-local-${row.id}`,
              kind: 'سحب',
              amount: Number(row.amount ?? 0),
              subtitle: `${row.method} · ${row.accountNumber}`,
              status: row.status ?? 'قيد المراجعة',
              timestamp: Date.now(),
              timeText: row.createdAt ?? '',
              approved: false,
              rejected: false,
            });
          }
        } catch {
          // تجاهل خطأ التخزين المحلي
        }
      }

      merged.sort((a, b) => b.timestamp - a.timestamp);

      if (active) {
        setEntries(merged);
      }
    }

    void loadAllHistory();
    return () => {
      active = false;
    };
  }, [profile?.id, historyVersion]);

  const counts = useMemo(() => {
    let topupCount = 0;
    let withdrawCount = 0;
    for (const item of entries) {
      if (item.kind === 'شحن') topupCount += 1;
      else withdrawCount += 1;
    }
    return { all: entries.length, شحن: topupCount, سحب: withdrawCount };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((item) => item.kind === filter);
  }, [entries, filter]);

  if (isLoading) return null;

  const visibleEntries = expanded ? filteredEntries : filteredEntries.slice(0, INITIAL_VISIBLE);
  const canToggle = filteredEntries.length > INITIAL_VISIBLE;

  return (
    <div
      id="wallet"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 pt-8 sm:px-6 sm:pt-10"
    >
      <WalletCard
        profile={profile}
        openWithdrawInitially={openWithdraw}
        onWithdrawModalChange={setOpenWithdraw}
        onTopUpSubmitted={() => {
          setHistoryVersion((value) => value + 1);
          void refreshProfile();
        }}
      />

      {profile && entries.length > 0 && (
        <section className="flex flex-col gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/85 p-3.5 text-zinc-100 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">
                <History className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-extrabold text-zinc-100 sm:text-base">سجل المحفظة</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
                {filteredEntries.length}
              </span>
            </div>

            {canToggle && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-brand-300 transition hover:bg-zinc-800"
              >
                <span>{expanded ? 'إخفاء' : `عرض الكل (${filteredEntries.length})`}</span>
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {/* أزرار التمييز بين الكل / شحن / سحب */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { key: 'all', label: `الكل (${counts.all})` },
                { key: 'شحن', label: `شحن (${counts['شحن']})` },
                { key: 'سحب', label: `سحب (${counts['سحب']})` },
              ] as const
            ).map((tab) => {
              const activeTab = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setFilter(tab.key);
                    setExpanded(false);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeTab
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-zinc-800 bg-zinc-950/90 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {visibleEntries.map((entry) => {
              const isWithdraw = entry.kind === 'سحب';
              const badgeClass = entry.approved
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                : entry.rejected
                  ? 'border-red-500/30 bg-red-500/15 text-red-300'
                  : 'border-amber-500/30 bg-amber-500/15 text-amber-300';

              const kindBadgeClass = isWithdraw
                ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border bg-zinc-950/90 px-3 py-2.5 ${
                    isWithdraw ? 'border-amber-500/20' : 'border-cyan-500/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isWithdraw
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-cyan-500/15 text-cyan-300'
                      }`}
                    >
                      {isWithdraw ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          dir="ltr"
                          className={`text-sm font-extrabold ${
                            isWithdraw ? 'text-amber-200' : 'text-cyan-200'
                          }`}
                        >
                          {isWithdraw ? '-' : '+'}
                          {formatPrice(entry.amount)}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${kindBadgeClass}`}
                        >
                          {entry.kind}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400">
                        <span className="truncate">{entry.subtitle}</span>
                        {entry.timeText && (
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {entry.timeText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeClass}`}
                  >
                    {entry.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
