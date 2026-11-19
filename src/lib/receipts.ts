import { supabase } from '@/lib/supabase';

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const RECEIPT_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateReceipt(file: File): string | null {
  if (!RECEIPT_EXTENSIONS[file.type]) {
    return 'الملف يجب أن يكون صورة بصيغة JPG أو PNG أو WebP';
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت';
  }
  return null;
}

export async function uploadReceipt(receipt: File): Promise<string | null> {
  const extension = RECEIPT_EXTENSIONS[receipt.type];
  if (!extension) return null;

  const receiptPath = `${crypto.randomUUID()}.${extension}`;
  try {
    const { error } = await supabase.storage.from('receipts').upload(receiptPath, receipt, {
      contentType: receipt.type,
      upsert: false,
    });
    return error ? null : receiptPath;
  } catch {
    return null;
  }
}

/** Short-lived link to a private receipt image (owner only). */
export async function fetchReceiptUrl(receiptPath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(receiptPath, 300);
  if (error || !data) throw new Error(error?.message ?? 'Receipt unavailable');
  return data.signedUrl;
}
