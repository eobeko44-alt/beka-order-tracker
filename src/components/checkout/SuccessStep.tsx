import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, CheckCircle2, Copy, MessageCircle, SearchCheck } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/format';

interface SuccessStepProps {
  gameName: string;
  packageLabel: string;
  playerId: string;
  receiptSaved: boolean;
  orderCode: string;
  onClose: () => void;
}

export default function SuccessStep({
  gameName,
  packageLabel,
  playerId,
  receiptSaved,
  orderCode,
  onClose,
}: SuccessStepProps) {
  const [copied, setCopied] = useState(false);
  const whatsappUrl = buildWhatsAppUrl(
    `مرحباً، أرسلت طلب شحن رقم ${orderCode} - ${gameName} - ${packageLabel} للاعب ID: ${playerId}${
      receiptSaved ? '، وهذا إشعار التحويل.' : '، وما قدرت أرفع صورة الإشعار هنا.'
    }`
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-300 animate-fade-up">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-zinc-50">تم استلام طلبك بنجاح</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          طلبك اتحفظ عندنا، وبنراجع التحويل ونشحن الباقة على حسابك في أقرب وقت.
        </p>
        {!receiptSaved && (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-200">
            ما وصلت صورة الإشعار. ابعتها لينا على واتساب عشان نسرّع التأكيد.
          </p>
        )}
      </div>
      {orderCode && (
        <div className="w-full rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
          <p className="text-xs font-semibold text-zinc-400">رقم طلبك — احفظه عشان تتابع حالته</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span dir="ltr" className="font-mono text-2xl font-extrabold tracking-widest text-zinc-50">
              {orderCode}
            </span>
            <button
              type="button"
              aria-label="نسخ رقم الطلب"
              onClick={() => {
                void navigator.clipboard?.writeText(orderCode).then(() => setCopied(true));
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <Link
            to="/track"
            search={{ q: orderCode }}
            onClick={onClose}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-brand-300 hover:text-brand-200"
          >
            <SearchCheck className="h-4 w-4" />
            تتبع حالة الطلب
          </Link>
        </div>
      )}
      <div className="flex w-full flex-col gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition-all duration-200 hover:bg-brand-500"
        >
          <MessageCircle className="h-4 w-4" />
          إرسال الإشعار على واتساب
        </a>
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          العودة إلى الألعاب
        </button>
      </div>
    </div>
  );
}
