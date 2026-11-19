import { supabase } from '@/lib/supabase';

export type PhoneLoginRequestStatus = 'pending' | 'approved' | 'rejected' | 'used';

export interface PhoneLoginRequest {
  id: string;
  phone: string;
  code: string;
  status: PhoneLoginRequestStatus;
  createdAt: string;
  expiresAt: string;
  reviewedAt: string | null;
}

/** Owners only (RLS): the latest WhatsApp sign-in requests, newest first. */
export async function fetchPhoneLoginRequests(): Promise<PhoneLoginRequest[]> {
  const { data, error } = await supabase
    .from('phone_login_requests')
    .select('id, phone, code, status, created_at, expires_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    phone: row.phone,
    code: row.code,
    status: row.status as PhoneLoginRequestStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    reviewedAt: row.reviewed_at,
  }));
}

export async function reviewPhoneLogin(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('review_phone_login', { p_request_id: id, p_approve: approve });
  if (error) throw new Error(error.message);
}

export function isRequestOpen(request: PhoneLoginRequest, now = Date.now()): boolean {
  return request.status === 'pending' && new Date(request.expiresAt).getTime() > now;
}
