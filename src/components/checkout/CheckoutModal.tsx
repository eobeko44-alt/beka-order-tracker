import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PlayerDetailsStep from '@/components/checkout/PlayerDetailsStep';
import PaymentMethodStep from '@/components/checkout/PaymentMethodStep';
import TransferStep from '@/components/checkout/TransferStep';
import SuccessStep from '@/components/checkout/SuccessStep';
import { formatPrice } from '@/lib/format';
import { submitOrder, submitWalletOrder, WALLET_METHOD_ID } from '@/lib/orders';
import { useAuth } from '@/hooks/useAuth';
import type { Game, Package, PaymentMethod } from '@/types';

type Step = 'player' | 'payment' | 'transfer' | 'done';

const STEP_ORDER: Step[] = ['player', 'payment', 'transfer'];

interface CheckoutModalProps {
  game: Game;
  pkg: Package;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
}

interface PlayerInfo {
  customerName: string;
  playerId: string;
  whatsapp: string;
}

export default function CheckoutModal({ game, pkg, paymentMethods, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('player');
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptSaved, setReceiptSaved] = useState(true);
  const [orderCode, setOrderCode] = useState('');

  const { profile, refreshProfile } = useAuth();
  const paymentMethod = paymentMethods.find((method) => method.id === paymentMethodId) ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isSubmitting]);

  async function handleSubmit(receipt: File) {
    if (!player || !paymentMethod) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitOrder({
        customerName: player.customerName,
        gameId: game.id,
        packageId: pkg.id,
        playerId: player.playerId,
        whatsapp: player.whatsapp,
        paymentMethodId: paymentMethod.id,
        payerAccount: '',
        receipt,
      });
      setReceiptSaved(result.receiptSaved);
      setOrderCode(result.orderCode);
      setStep('done');
    } catch {
      setSubmitError(
        navigator.onLine
          ? 'ما قدرنا نحفظ طلبك الآن، جرّب تاني بعد شوية.'
          : 'الإنترنت مقطوع عندك، اتأكد من الشبكة وجرّب تاني.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWalletPay() {
    if (!player) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const code = await submitWalletOrder({ ...player, gameId: game.id, packageId: pkg.id });
      setOrderCode(code);
      await refreshProfile();
      setReceiptSaved(true);
      setStep('done');
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message.includes('INSUFFICIENT_BALANCE')
          ? 'رصيد محفظتك ما بكفي لهذا الطلب.'
          : 'ما قدرنا نحفظ طلبك الآن، جرّب تاني بعد شوية.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={() => !isSubmitting && onClose()}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`شحن ${game.name_ar}`}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:max-w-lg sm:rounded-3xl animate-fade-up"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-400">{game.name_ar}</p>
            <p className="mt-1 truncate text-base font-bold text-zinc-50">
              {pkg.label_ar}
              <span className="mx-2 text-zinc-600">|</span>
              <span className="text-brand-300">{formatPrice(pkg.price_sdg)}</span>
            </p>
            {step !== 'done' && (
              <div className="mt-4 flex items-center gap-2" aria-label="خطوات الطلب">
                {STEP_ORDER.map((item, index) => (
                  <span
                    key={item}
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      index <= currentIndex ? 'bg-brand-500' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="إغلاق"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          {step === 'player' && (
            <PlayerDetailsStep
              initial={player}
              onNext={(info) => {
                setPlayer(info);
                setStep('payment');
              }}
            />
          )}
          {step === 'payment' && (
            <PaymentMethodStep
              methods={paymentMethods}
              selectedId={paymentMethodId}
              walletBalance={profile ? profile.balance : null}
              price={pkg.price_sdg}
              onBack={() => setStep('player')}
              onNext={(methodId) => {
                setPaymentMethodId(methodId);
                setStep('transfer');
              }}
            />
          )}
          {step === 'transfer' && paymentMethodId === WALLET_METHOD_ID && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-zinc-50">تأكيد الدفع من المحفظة</h2>
              <p className="text-sm text-zinc-400">
                هيتم خصم {formatPrice(pkg.price_sdg)} من رصيدك الآن. لو اترفض الطلب، المبلغ برجع لمحفظتك.
              </p>
              {submitError && <p className="text-sm text-red-400">{submitError}</p>}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep('payment')} disabled={isSubmitting} className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300">
                  السابق
                </button>
                <button type="button" onClick={handleWalletPay} disabled={isSubmitting} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50">
                  {isSubmitting ? 'جاري الدفع...' : 'ادفع من المحفظة'}
                </button>
              </div>
            </div>
          )}
          {step === 'transfer' && paymentMethod && (
            <TransferStep
              method={paymentMethod}
              amountLabel={formatPrice(pkg.price_sdg)}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onBack={() => setStep('payment')}
              onSubmit={handleSubmit}
            />
          )}
          {step === 'done' && player && (
            <SuccessStep
              gameName={game.name_ar}
              packageLabel={pkg.label_ar}
              playerId={player.playerId}
              receiptSaved={receiptSaved}
              orderCode={orderCode}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
