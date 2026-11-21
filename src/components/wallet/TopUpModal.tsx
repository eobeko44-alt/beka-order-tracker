import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import ReceiptUpload from '@/components/checkout/ReceiptUpload';
import { buildWhatsAppUrl, formatPrice } from '@/lib/format';
import { validateReceipt } from '@/lib/orders';
import { fetchPaymentMethods } from '@/lib/paymentMethods';
import { createTopUp } from '@/lib/topups';
import { TOP_UP_METHOD_LABELS } from '@/lib/wallet';
import { describeAuthError } from '@/lib/authErrors';
import type { PaymentMethod, TopUpMethodId } from '@/types';

const MAX_AMOUNT = 1_000_000;
const QUICK_AMOUNTS = [5_000, 10_000, 25_000];
const TOP_UP_METHOD_IDS = Object.keys(TOP_UP_METHOD_LABELS) as TopUpMethodId[];

interface TopUpModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function TopUpModal({ userId, userName, onClose, onSubmitted }: TopUpModalProps) {
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [method, setMethod] = useState<TopUpMethodId>('fawry');
  const [amountInput, setAmountInput] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ amount?: string; transaction?: string; receipt?: string; submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchPaymentMethods()
      .then((items) => {
        if (active) {
          setMethods(
            items.filter((item) => item.is_active && TOP_UP_METHOD_IDS.includes(item.id as TopUpMethodId))
          );
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isSubmitting]);

  const selectedMethodItem = methods?.find((item) => item.id === method) ?? null;
  const selectedAccount = selectedMethodItem?.account_value ?? null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const amount = Number(amountInput);
    const nextErrors: typeof errors = {};
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
      nextErrors.amount = `أدخل مبلغاً صحيحاً بين 1 و ${MAX_AMOUNT.toLocaleString('en-US')} ج.س`;
    }
    const trimmedTransaction = transactionNumber.trim();
    if (trimmedTransaction.length < 3 || trimmedTransaction.length > 60) {
      nextErrors.transaction = 'أدخل رقم العملية كما يظهر في إشعار التحويل';
    }
    if (!receipt) {
      nextErrors.receipt = 'ارفع صورة إشعار التحويل';
    } else {
      const receiptError = validateReceipt(receipt);
      if (receiptError) nextErrors.receipt = receiptError;
    }
    if (Object.keys(nextErrors).length > 0 || !receipt) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await createTopUp(
        { amount, method, transactionNumber: trimmedTransaction, receipt },
        userId
      );
      setSubmittedAmount(amount);
      onSubmitted();
    } catch (err) {
      setErrors({ submit: describeAuthError(err) });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base font-semibold text-zinc-50 placeholder:font-normal placeholder:text-zinc-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/35';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={() => !isSubmitting && onClose()}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="اشحن محفظتك"
        className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-fade-up sm:max-w-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950/50 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-1">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-extrabold text-brand-300 ring-1 ring-brand-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              شحن المحفظة
            </span>
            <h2 className="mt-1 text-xl font-extrabold text-zinc-50 sm:text-2xl">أضف رصيداً لمحفظتك</h2>
            <p className="text-xs text-zinc-400 sm:text-sm">اختر طريقة التحويل وأدخل المبلغ وبيانات الإشعار</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="إغلاق"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-800/90 text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          {submittedAmount !== null ? (
            <TopUpSuccess name={userName} amount={submittedAmount} onClose={onClose} />
          ) : loadError ? (
            <p className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300">
              تعذر تحميل طرق التحويل، حاول مرة أخرى لاحقاً.
            </p>
          ) : methods === null ? (
            <p className="flex items-center justify-center gap-2.5 py-12 text-sm font-semibold text-zinc-300">
              <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
              جاري تحميل طرق التحويل...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-extrabold text-zinc-100 sm:text-base">
                  1. اختر طريقة التحويل
                </legend>
                {methods.map((item) => {
                  const isSelected = method === item.id;
                  return (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-brand-400 bg-brand-600/20 ring-1 ring-brand-400/50 shadow-lg shadow-brand-700/20'
                          : 'border-zinc-700/90 bg-zinc-950/75 hover:border-zinc-500'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="topup-method"
                          value={item.id}
                          checked={isSelected}
                          onChange={() => setMethod(item.id as TopUpMethodId)}
                          className="h-4 w-4 accent-brand-500"
                        />
                        <span className="text-sm font-extrabold text-zinc-50 sm:text-base">{item.name_ar}</span>
                      </span>
                      <span
                        dir="ltr"
                        className="rounded-lg bg-zinc-900/90 px-2.5 py-1 text-xs font-extrabold tracking-wider text-brand-300 ring-1 ring-white/10 sm:text-sm"
                      >
                        {item.account_value}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {selectedAccount && (
                <div className="flex items-start gap-3 rounded-2xl border border-brand-500/30 bg-brand-950/45 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                  <p className="text-sm leading-relaxed text-zinc-200">
                    حوّل المبلغ إلى{' '}
                    <span className="font-bold text-white">{selectedMethodItem?.name_ar}</span> على الرقم{' '}
                    <span dir="ltr" className="font-extrabold text-brand-300">
                      {selectedAccount}
                    </span>{' '}
                    ثم ارفع صورة الإشعار أدناه.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <label htmlFor="topup-amount" className="text-sm font-extrabold text-zinc-100 sm:text-base">
                  2. المبلغ (ج.س)
                </label>
                <input
                  id="topup-amount"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="10000"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_AMOUNTS.map((preset) => {
                    const active = Number(amountInput) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountInput(String(preset))}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                          active
                            ? 'border-brand-400 bg-brand-600 text-white'
                            : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white'
                        }`}
                      >
                        {preset.toLocaleString('en-US')} ج.س
                      </button>
                    );
                  })}
                </div>
                {errors.amount && <span className="text-sm font-medium text-red-400">{errors.amount}</span>}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-extrabold text-zinc-100 sm:text-base">3. رقم العملية</span>
                <input
                  value={transactionNumber}
                  onChange={(event) => setTransactionNumber(event.target.value)}
                  dir="ltr"
                  placeholder="TXN123456"
                  className={inputClass}
                />
                {errors.transaction && <span className="text-sm font-medium text-red-400">{errors.transaction}</span>}
              </label>

              <ReceiptUpload file={receipt} error={errors.receipt ?? null} onChange={setReceipt} />

              {errors.submit && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                >
                  {errors.submit}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 text-base font-extrabold text-white shadow-xl shadow-brand-600/30 transition-all duration-200 hover:bg-brand-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                إرسال طلب الشحن
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TopUpSuccess({ name, amount, onClose }: { name: string; amount: number; onClose: () => void }) {
  const message = `طلب شحن جديد من ${name} بمبلغ ${formatPrice(amount)}`;
  return (
    <div className="flex flex-col items-center gap-5 py-5 text-center animate-fade-up">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-extrabold text-zinc-50">تم استلام طلبك</h3>
        <p className="text-sm leading-relaxed text-zinc-400">
          طلبك الآن قيد المراجعة، وهيتضاف المبلغ لرصيدك بعد ما نتأكد من التحويل.
        </p>
      </div>
      <a
        href={buildWhatsAppUrl(message)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/30"
      >
        أرسل الطلب عبر واتساب
      </a>
      <button
        type="button"
        onClick={onClose}
        className="text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
      >
        إغلاق
      </button>
    </div>
  );
}
