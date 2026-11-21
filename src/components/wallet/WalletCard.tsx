import { useState } from 'react';
import { Plus, Star, Wallet } from 'lucide-react';
import TopUpModal from '@/components/wallet/TopUpModal';
import { Link } from '@tanstack/react-router';
import { buildWhatsAppUrl, formatPrice } from '@/lib/format';
import { loyaltyProgress, SDG_PER_POINT } from '@/lib/loyalty';
import type { UserProfile } from '@/types';

interface WalletCardProps {
  profile: UserProfile | null;
  onTopUpSubmitted?: () => void;
}

const actionClass =
  'inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-5 py-4 text-[0.95rem] font-extrabold shadow-lg transition hover:opacity-95 active:scale-[0.99]';

const actionStyle = {
  backgroundColor: '#ffffff',
  color: '#1e1b4b',
} as const;

export default function WalletCard({ profile, onTopUpSubmitted }: WalletCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const loyalty = loyaltyProgress(profile?.points ?? 0);

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-700 via-brand-600 to-electric-600 p-5 text-white shadow-2xl shadow-brand-700/30 animate-fade-up sm:p-8">
      <div className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -start-10 h-56 w-56 rounded-full bg-electric-400/20 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:gap-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Wallet className="h-6 w-6" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-lg font-extrabold sm:text-xl">شحن المحفظة</h2>
            <p className="text-sm text-white/75">اشحن رصيدك وادفع طلباتك مباشرة</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col justify-between gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm sm:p-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                <Wallet className="h-4 w-4" />
                رصيدك
              </span>
              <p dir="ltr" className="text-end text-2xl font-extrabold tracking-tight sm:text-3xl">
                {formatPrice(profile?.balance ?? 0)}
              </p>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm sm:p-5">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Star className="h-4 w-4" />
                  نقاطك
                </span>
                <p dir="ltr" className="text-end text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {(profile?.points ?? 0).toLocaleString('en-US')}
                </p>
              </div>

              <div className="mt-1 flex flex-col gap-1.5">
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
                  <p className="text-[11px] leading-snug text-white/80">
                    {loyalty.points}/{loyalty.target} نقطة = كود شحن · 1 نقطة لكل {SDG_PER_POINT.toLocaleString('en-US')} ج.س
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex">
          {profile ? (
            <button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              className={actionClass}
              style={actionStyle}
            >
              <Plus className="h-5 w-5" style={{ color: '#1e1b4b' }} />
              <span style={{ color: '#1e1b4b' }}>اشحن محفظتي</span>
            </button>
          ) : (
            <Link to="/account" className={actionClass} style={actionStyle}>
              <span style={{ color: '#1e1b4b' }}>سجل دخولك عشان تشحن محفظتك</span>
            </Link>
          )}
        </div>
      </div>

      {isTopUpOpen && profile && (
        <TopUpModal
          userId={profile.id}
          userName={profile.name ?? ''}
          onClose={() => setIsTopUpOpen(false)}
          onSubmitted={onTopUpSubmitted}
        />
      )}
    </section>
  );
}
