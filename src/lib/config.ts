export const STORE_NAME = 'بيكا ستور BEKA STORE';

export const STORE_LOGO_URL = '/favicon.png';

export const STORE_WHATSAPP_NUMBER = '249114071454';

export const STORE_CONTACT_DISPLAY = '0114071454';

export const ADMIN_ROUTE = '/beko-admin-2026';

export const ACCOUNT_ROUTE = '/account';

export const ORDERS_ROUTE = '/orders';

export const FAVORITES_ROUTE = '/favorites';

export const TRACK_ROUTE = '/track';

/** Main public address of the store; Google sign-in always returns here. */
export const SITE_URL = 'https://beka-order-tracker.vercel.app';

/** Where Google sends the customer back: this page when already on the main site, otherwise the main site. */
export function authRedirectUrl(): string {
  const main = new URL(SITE_URL);
  if (typeof window !== 'undefined' && window.location.hostname === main.hostname) {
    return window.location.origin;
  }
  return main.origin;
}
