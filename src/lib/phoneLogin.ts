import { STORE_NAME } from '@/lib/config';

/** How long a customer has to send the code on WhatsApp and get approved. */
export const PHONE_LOGIN_TTL_MINUTES = 15;

const SYNTHETIC_DOMAIN = 'phone.beka-store.app';

/** Phone-login accounts get an internal address so the backend can sign them in; it never receives mail. */
export function phoneLoginEmail(localPhone: string): string {
  return `p249${localPhone.slice(1)}@${SYNTHETIC_DOMAIN}`;
}

export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_DOMAIN}`);
}

/** Ready-made WhatsApp message the customer sends to the store to confirm their number. */
export function buildPhoneLoginMessage(localPhone: string, code: string): string {
  return [
    `مرحباً ${STORE_NAME}، أريد تسجيل الدخول برقم هاتفي.`,
    `رقمي: ${localPhone}`,
    `رمز التحقق: ${code}`,
  ].join('\n');
}

export type PhoneLoginStatus = 'pending' | 'approved' | 'rejected' | 'expired';
