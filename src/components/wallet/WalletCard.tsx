import { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, Star, Wallet } from 'lucide-react';
import TopUpModal from '@/components/wallet/TopUpModal';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import { Link } from '@tanstack/react-router';
import { buildWhatsAppUrl, formatPrice } from '@/lib/format';
import { loyaltyProgress, SDG_PER_POINT } from '@/lib/loyalty';
import type { UserProfile } from '@/types';

interface WalletCardProps {
  profile: UserProfile | null;
  isSignedIn?: boolean;
  onTopUpSubmitted?: () => void;
  openWithdrawInitially?: boolean;
  onWithdrawModalChange?: (open: boolean) => void;
}

const actionClass =
  'inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-extrabold shadow-md transition hover:opacity-95 active:scale-[0.99]';

const actionStyle = {
  backgroundColor: '#ffffff',
  color: '#1e1b4b',
} as const;

export default function WalletCard({
  profile,
  isSignedIn = false,
  onTopUpSubmitted,
  openWithdrawInitially = false,
  onWithdrawModalChange,
}: WalletCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(openWithdrawInitially);
  const loyalty = loyaltyProgress(profile?.points ?? 0);
  const hasAuthenticatedAccount = Boolean(profile || isSignedIn);

  useEffect(() => {
    if (openWithdrawInitially) {
      setIsWithdrawOpen(true);
    }
  }, [openWithdrawInitially]);

  function handleOpenWithdraw() {
    setIsWithdrawOpen(true);
    onWithdrawModalChange?.(true);
  }

  function handleCloseWithdraw() {
    setIsWithdrawOpen(false);
    onWithdrawModalChange?.(false);
  }

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-700 via-brand-600 to-electric-600 p-4 text-white shadow-xl shadow-brand-700/25 sm:rounded-3xl sm:p-6">
      <div className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -start-10 h-48 w-48 rounded-full bg-electric-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-3.5 sm:gap-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-base font-extrabold sm:text-lg">المحفظة</h2>
            <p className="text-xs text-white/75 sm:text-sm">اشحن رصيدك أو اطلب سحب أموالك بسهولة</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            <div className="flex flex-col justify-between gap-1.5 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm sm:p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 sm:text-sm">
                <Wallet className="h-3.5 w-3.5" />
                رصيدك
              </span>
              <p dir="ltr" className="text-end text-xl font-extrabold tracking-tight sm:text-2xl">
                {formatPrice(profile?.balance ?? 0)}
              </p>
            </div>

            <div className="flex flex-col justify-between gap-1.5 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm sm:p-4">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 sm:text-sm">
                  <Star className="h-3.5 w-3.5" />
                  نقاطك
                </span>
                <p dir="ltr" className="text-end text-xl font-extrabold tracking-tight sm:text-2xl">
                  {(profile?.points ?? 0).toLocaleString('en-US')}
                </p>
              </div>

              <div className="mt-0.5 flex flex-col gap-1">
                <div
                  role="progressbar"
                  aria-label="التقدم نحو كود الشحن"
                  aria-valuemin={0}
                  aria-valuemax={loyalty.target}
                  aria-valuenow={Math.min(loyalty.points, loyalty.target)}
                  className="h-1.5 overflow-hidden rounded-full bg-white/15"
                >
                  <span
                    className="block h-full rounded-full bg-star transition-[width] duration-500"
                    style={{ width: `${loyalty.percent}%` }}
                  />
                </div>

                {loyalty.reached ? (
                  <a
                    href={buildWhatsAppUrl(`مرحباً جمعت ${loyalty.points} نقطة وعايز أستلم كود الشحن`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-star underline-offset-2 hover:underline"
                  >
                    وصلت {loyalty.target} نقطة! اطلب كود الشحن
                  </a>
                ) : (
                  <p className="text-[10px] leading-snug text-white/80 sm:text-[11px]">
                    {loyalty.points}/{loyalty.target} نقطة = كود شحن · 1 نقطة لكل {SDG_PER_POINT.toLocaleString('en-US')} ج.س
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {hasAuthenticatedAccount ? (
            <>
              <button
                type="button"
                onClick={() => setIsTopUpOpen(true)}
                className={actionClass}
                style={actionStyle}
              >
                <Plus className="h-4 w-4" style={{ color: '#1e1b4b' }} />
                <span style={{ color: '#1e1b4b' }}>اشحن محفظتي</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWithdraw}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/30 bg-zinc-950/60 px-4 py-3 text-sm font-extrabold text-white shadow-md backdrop-blur-sm transition hover:bg-zinc-950/80 active:scale-[0.99]"
              >
                <ArrowUpRight className="h-4 w-4 text-brand-200" />
                <span>سحب الرصيد</span>
              </button>
            </>
          ) : (
            <Link to="/account" className={actionClass} style={actionStyle}>
              <span style={{ color: '#1e1b4b' }}>سجل دخولك عشان تشحن محفظتك</span>
            </Link>
          )}
        </div>
      </div>

      {isTopUpOpen && (
        <TopUpModal
          userId={profile?.id}
          userName={profile?.name ?? ''}
          onClose={() => setIsTopUpOpen(false)}
          onSubmitted={onTopUpSubmitted}
        />
      )}

      {isWithdrawOpen && (
        <WithdrawModal
          userId={profile?.id}
          balance={profile?.balance ?? 0}
          userName={profile?.name ?? ''}
          onClose={handleCloseWithdraw}
          onSubmitted={onTopUpSubmitted}
        />
      )}
    </section>
  );
}
