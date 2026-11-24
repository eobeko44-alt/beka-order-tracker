import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  isValidPlayerId,
  isValidWhatsapp,
  normalizePlayerId,
  normalizeWhatsapp,
} from '@/lib/orders';

export interface PlayerInfo {
  customerName: string;
  playerId: string;
  whatsapp: string;
}

interface PlayerDetailsStepProps {
  initial: PlayerInfo | null;
  onNext: (info: PlayerInfo) => void;
  gameName?: string;
  gameSlug?: string;
}

const INPUT_CLASS =
  'h-12 w-full rounded-xl border bg-zinc-950 px-4 text-base text-zinc-50 placeholder:text-zinc-600 outline-none transition-all duration-200 focus:ring-4 focus:ring-brand-500/20';

function isClashOfClans(gameName?: string, gameSlug?: string): boolean {
  const combined = `${gameName ?? ''} ${gameSlug ?? ''}`.toLowerCase();
  return (
    combined.includes('clash') ||
    combined.includes('كلاش') ||
    combined.includes('كلاشن')
  );
}

function isVisaCard(gameName?: string, gameSlug?: string): boolean {
  const combined = `${gameName ?? ''} ${gameSlug ?? ''}`.toLowerCase();
  return combined.includes('visa') || combined.includes('فيزا');
}

function isValidSupercellEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export default function PlayerDetailsStep({
  initial,
  onNext,
  gameName,
  gameSlug,
}: PlayerDetailsStepProps) {
  const isClash = isClashOfClans(gameName, gameSlug);
  const isVisa = !isClash && isVisaCard(gameName, gameSlug);

  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [playerId, setPlayerId] = useState(
    initial?.playerId && initial.playerId !== 'VISA-CARD' ? initial.playerId : ''
  );
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [errors, setErrors] = useState<{ customerName?: string; playerId?: string; whatsapp?: string }>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = customerName.trim();
    const normalizedPhone = normalizeWhatsapp(whatsapp);

    let normalizedIdentifier = '';
    if (isVisa) {
      normalizedIdentifier = 'VISA-CARD';
    } else if (isClash) {
      normalizedIdentifier = playerId.trim().toLowerCase();
    } else {
      normalizedIdentifier = normalizePlayerId(playerId);
    }

    const nextErrors: typeof errors = {};
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      nextErrors.customerName = 'اكتب اسمك (من حرفين لحد 80 حرف)';
    }

    if (!isVisa) {
      if (isClash) {
        if (!isValidSupercellEmail(normalizedIdentifier)) {
          nextErrors.playerId = 'أدخل إيميل سوبرسل صحيح، مثال: name@gmail.com';
        }
      } else if (!isValidPlayerId(normalizedIdentifier)) {
        nextErrors.playerId = 'أدخل ID اللاعب (من 3 إلى 50 حرفاً أو رقماً)';
      }
    }

    if (!isValidWhatsapp(normalizedPhone)) {
      nextErrors.whatsapp = 'أدخل رقم واتساب صحيح مع كود الدولة، مثال: 249912345678';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onNext({
      customerName: normalizedName,
      playerId: normalizedIdentifier,
      whatsapp: normalizedPhone,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-50">بياناتك</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {isVisa
            ? 'اكتب اسمك ورقم واتساب للتواصل معك'
            : isClash
              ? 'اكتب اسمك وإيميل سوبرسل ورقم واتساب للتواصل معك'
              : 'اكتب اسمك وID اللاعب ورقم واتساب للتواصل معك'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="customer-name" className="text-sm font-semibold text-zinc-200">
          الاسم
        </label>
        <input
          id="customer-name"
          type="text"
          autoComplete="name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="اسمك الكامل"
          aria-invalid={Boolean(errors.customerName)}
          className={`${INPUT_CLASS} ${
            errors.customerName ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-brand-500'
          }`}
        />
        {errors.customerName && <p className="text-sm text-red-400">{errors.customerName}</p>}
      </div>

      {!isVisa && (
        <div className="flex flex-col gap-2">
          <label htmlFor="player-id" className="text-sm font-semibold text-zinc-200">
            {isClash ? 'إيميل سوبرسل' : 'ID اللاعب'}
          </label>
          <input
            id="player-id"
            type={isClash ? 'email' : 'text'}
            dir="ltr"
            inputMode={isClash ? 'email' : 'numeric'}
            autoComplete={isClash ? 'email' : undefined}
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
            placeholder={isClash ? 'example@gmail.com' : 'مثال: 5123456789'}
            aria-invalid={Boolean(errors.playerId)}
            className={`${INPUT_CLASS} text-start ${
              errors.playerId ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-brand-500'
            }`}
          />
          {errors.playerId && <p className="text-sm text-red-400">{errors.playerId}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="whatsapp" className="text-sm font-semibold text-zinc-200">
          رقم الواتساب
        </label>
        <input
          id="whatsapp"
          type="tel"
          dir="ltr"
          inputMode="tel"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="249912345678"
          aria-invalid={Boolean(errors.whatsapp)}
          className={`${INPUT_CLASS} text-start ${
            errors.whatsapp ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-brand-500'
          }`}
        />
        {errors.whatsapp && <p className="text-sm text-red-400">{errors.whatsapp}</p>}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 text-xs leading-6 text-zinc-400">
        <p className="font-semibold text-zinc-200">شروط وتنبيهات الطلب:</p>
        {isVisa ? (
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>تأكد من كتابة اسمك ورقم واتساب بشكل صحيح لاستلام تفاصيل البطاقة.</li>
            <li>سيتم التواصل معك عبر واتساب بعد تأكيد الدفع لتسليم بيانات الفيزا.</li>
            <li>لا يمكن إلغاء الطلب أو استرداد المبلغ بعد إصدار أو تسليم البطاقة.</li>
          </ul>
        ) : isClash ? (
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>تأكد من كتابة إيميل Supercell المرتبط بالقريه بشكل صحيح.</li>
            <li>قد نحتاج للتواصل معك عبر واتساب لتأكيد رمز الدخول أثناء التنفيذ.</li>
            <li>لا يمكن إلغاء الطلب أو استرداد المبلغ بعد بدء شحن الحساب.</li>
          </ul>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pr-4">
            <li>تأكد من صحة ID اللاعب ورقم الواتساب قبل المتابعة؛ المتجر غير مسؤول عن خطأ الإدخال.</li>
            <li>أدخل رقم واتساب فعّال للتواصل معك عند الحاجة.</li>
            <li>لا يمكن إلغاء الطلب أو استرداد المبلغ بعد بدء التنفيذ.</li>
          </ul>
        )}
      </div>

      <button
        type="submit"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white transition-all duration-200 hover:bg-brand-500 active:scale-[0.99]"
      >
        متابعة
        <ArrowLeft className="h-4 w-4" />
      </button>
    </form>
  );
}
