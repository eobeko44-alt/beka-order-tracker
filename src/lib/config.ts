export const STORE_NAME = 'بيكا ستور BEKA STORE';

export const STORE_LOGO_URL = '/favicon.png';

export const STORE_WHATSAPP_NUMBER = '249114071454';

export const STORE_CONTACT_DISPLAY = '0114071454';

export const ADMIN_ROUTE = '/beko-admin-2026';

export const ACCOUNT_ROUTE = '/account';

export const ORDERS_ROUTE = '/orders';

export const FAVORITES_ROUTE = '/favorites';

export const TRACK_ROUTE = '/track';

/** Google sends the customer back to the same site they started on (e.g. the Vercel address). */
export function authRedirectUrl(): string {
  return window.location.origin;
}
