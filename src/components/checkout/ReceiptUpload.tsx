import { useEffect, useId, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ReceiptUploadProps {
  file: File | null;
  error: string | null;
  onChange: (file: File | null) => void;
}

export default function ReceiptUpload({ file, error, onChange }: ReceiptUploadProps) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-bold text-zinc-100 sm:text-base">صورة إشعار التحويل</span>

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-2">
          <img
            src={previewUrl}
            alt="إشعار التحويل"
            className="max-h-72 w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="إزالة الصورة"
            className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/85 text-zinc-200 ring-1 ring-white/15 transition hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors sm:py-8 ${
            error
              ? 'border-red-500/70 bg-red-500/5 hover:border-red-400'
              : 'border-zinc-700 bg-zinc-950/60 hover:border-brand-400 hover:bg-zinc-950'
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/90 text-brand-300 ring-1 ring-white/10">
            <ImagePlus className="h-7 w-7" />
          </span>
          <span className="text-sm font-extrabold text-zinc-100 sm:text-base">
            اضغط لرفع صورة الإشعار
          </span>
          <span className="text-xs text-zinc-400 sm:text-sm">
            JPG أو PNG أو WebP حتى 5 ميجابايت
          </span>
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      {error && <p className="text-sm font-medium text-red-400">{error}</p>}
    </div>
  );
}
