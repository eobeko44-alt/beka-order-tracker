import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CheckCircle2, Info, X } from 'lucide-react';
import { buildWhatsAppUrl, formatPrice } from '@/lib/format';

export type WithdrawMethod = 'ماي كاشي' | 'فوري' | 'أوكاش';

export interface WithdrawRecord {
  id: string;
  amount: number;
  method: WithdrawMethod;
  accountName: string;
  accountNumber: string;
  status: 'قيد المراجعة';
  createdAt: string;
}

interface WithdrawModalProps {
  userId?: string;
  balance: number;
  userName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const WITHDRAW_METHODS: WithdrawMethod[] = ['ماي كاشي', 'فوري', 'أوكاش'];
const MIN_WITHDRAW_AMOUNT = 1000;

const METHOD_HINTS: Record<WithdrawMethod, string> = {
  'ماي كاشي': 'تأكد من كتابة رقم حساب أو محفظة ماي كاشي والاسم المطابق لها بدقة.',
  فوري: 'أدخل رقم الهاتف أو الحساب المرتبط بخدمة فوري والاسم الثلاثي لصاحب الحساب.',
  أوكاش: 'تأكد من إدخال رقم محفظة أوكاش النشط واسم صاحب الحساب بشكل صحيح.',
};

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20';

export function getWithdrawStorageKey(userId?: string) {
  return `beka_withdrawals_${userId ?? 'guest'}`;
}

export default function WithdrawModal({
  userId,
  balance,
  userName,
  onClose,
  onSubmitted,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod | ''>('');
  const [accountName, setAccountName] = useState(userName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [errors, setErrors] = useState<{
    amount?: string;
    method?: string;
    accountName?: string;
    accountNumber?: string;
  }>({});
  const [submittedRecord, setSubmittedRecord] = useState<WithdrawRecord | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const nextErrors: typeof errors = {};

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'أدخل المبلغ المراد سحبه بشكل صحيح';
    } else if (numericAmount < MIN_WITHDRAW_AMOUNT) {
      nextErrors.amount = `الحد الأدنى للسحب هو ${MIN_WITHDRAW_AMOUNT.toLocaleString('en-US')} ج.س.`;
    } else if (numericAmount > balance) {
      nextErrors.amount = 'المبلغ المطلوب أكبر من رصيد محفظتك المتاح';
    }

    if (!method) {
      nextErrors.method = 'اختر طريقة الاستلام (ماي كاشي، فوري، أو أوكاش)';
    }

    const trimmedName = accountName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      nextErrors.accountName = 'اكتب اسم صاحب الحساب بشكل صحيح';
    }

    const trimmedAccount = accountNumber.trim();
    if (trimmedAccount.length < 5 || trimmedAccount.length > 40) {
      nextErrors.accountNumber = 'أدخل رقم الحساب أو الهاتف بشكل صحيح';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !method) return;

    const record: WithdrawRecord = {
      id: `WD-${Date.now().toString().slice(-6)}`,
      amount: numericAmount,
      method,
      accountName: trimmedName,
      accountNumber: trimmedAccount,
      status: 'قيد المراجعة',
      createdAt: new Date().toLocaleString('ar-SD', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    try {
      const key = getWithdrawStorageKey(userId);
      const existingRaw = window.localStorage.getItem(key);
      const existing: WithdrawRecord[] = existingRaw ? (JSON.parse(existingRaw) as WithdrawRecord[]) : [];
      window.localStorage.setItem(key, JSON.stringify([record, ...existing]));
    } catch {
      // تجاهل أخطاء التخزين المحلي في المتصفحات المقيدة
    }

    setSubmittedRecord(record);
    onSubmitted?.();
  }

  const whatsappMessage = submittedRecord
    ? `طلب سحب رصيد من المحفظة (${submittedRecord.id}):\n- المبلغ: ${formatPrice(submittedRecord.amount)}\n- طريقة الاستلام: ${submittedRecord.method}\n- اسم صاحب الحساب: ${submittedRecord.accountName}\n- رقم الحساب/الهاتف: ${submittedRecord.accountNumber}`
    : '';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="سحب الأموال"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-brand-500/30 bg-zinc-900 p-5 text-zinc-50 shadow-2xl sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30">
              <ArrowUpRight className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-50">سحب الأموال</h2>
              <p className="text-xs text-zinc-400">
                رصيد محفظتك المتاح:{' '}
                <span dir="ltr" className="font-bold text-brand-300">
                  {formatPrice(balance)}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submittedRecord ? (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-200">
                تم تسجيل طلب السحب ({submittedRecord.id})
              </p>
              <p className="text-xs leading-6 text-zinc-300">
                المبلغ: <strong>{formatPrice(submittedRecord.amount)}</strong> عبر{' '}
                <strong>{submittedRecord.method}</strong> لحساب{' '}
                <strong>{submittedRecord.accountName}</strong> ({submittedRecord.accountNumber}).
              </p>
            </div>

            <a
              href={buildWhatsAppUrl(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-500"
            >
              إرسال تأكيد الطلب عبر واتساب
            </a>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="withdraw-amount" className="text-sm font-semibold text-zinc-200">
                المبلغ المراد سحبه
              </label>
              <input
                id="withdraw-amount"
                type="number"
                min={MIN_WITHDRAW_AMOUNT}
                step="any"
                dir="ltr"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="أدخل المبلغ"
                className={`${INPUT_CLASS} text-start ${
                  errors.amount ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="withdraw-method" className="text-sm font-semibold text-zinc-200">
                طريقة الاستلام
              </label>
              <select
                id="withdraw-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as WithdrawMethod | '')}
                className={`${INPUT_CLASS} ${
                  errors.method ? 'border-red-500 focus:border-red-500' : ''
                }`}
              >
                <option value="">اختر طريقة السحب</option>
                {WITHDRAW_METHODS.map((item) => (
                  <option key={item} value={item} className="bg-zinc-900 text-zinc-50">
                    {item}
                  </option>
                ))}
              </select>
              {errors.method && <p className="text-xs text-red-400">{errors.method}</p>}
              {method && (
                <div className="mt-1 flex items-start gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-2.5 text-xs text-cyan-200">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{METHOD_HINTS[method]}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="withdraw-account-name" className="text-sm font-semibold text-zinc-200">
                اسم صاحب الحساب
              </label>
              <input
                id="withdraw-account-name"
                type="text"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="الاسم الكامل لصاحب الحساب"
                className={`${INPUT_CLASS} ${
                  errors.accountName ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.accountName && <p className="text-xs text-red-400">{errors.accountName}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="withdraw-account-number" className="text-sm font-semibold text-zinc-200">
                رقم الحساب أو الهاتف
              </label>
              <input
                id="withdraw-account-number"
                type="text"
                dir="ltr"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="مثال: 0912345678 أو رقم الحساب"
                className={`${INPUT_CLASS} text-start ${
                  errors.accountNumber ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.accountNumber && (
                <p className="text-xs text-red-400">{errors.accountNumber}</p>
              )}
            </div>

            <div className="rounded-xl border border-brand-500/20 bg-zinc-950/90 p-3.5 text-xs leading-6 text-zinc-300">
              <p>
                الحد الأدنى للسحب:{' '}
                <strong className="text-zinc-100">
                  {MIN_WITHDRAW_AMOUNT.toLocaleString('en-US')} ج.س.
                </strong>
              </p>
              <p>
                رسوم السحب: <strong className="text-zinc-100">0 ج.س.</strong>
              </p>
              <p className="text-brand-300">سيتم حجز المبلغ ومراجعة الطلب عند الإرسال.</p>
            </div>

            <button
              type="submit"
              className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition hover:bg-brand-500 active:scale-[0.99]"
            >
              تأكيد طلب السحب
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
