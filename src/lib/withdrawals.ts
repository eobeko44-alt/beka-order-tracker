import { supabase } from '@/lib/supabase';

export type WithdrawMethod = 'ماي كاشي' | 'فوري' | 'أوكاش';
export type WithdrawStatus = 'قيد المراجعة' | 'تم التحويل' | 'مرفوض';

export interface WithdrawRequestItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  amount: number;
  method: WithdrawMethod;
  account_name: string;
  account_number: string;
  status: WithdrawStatus;
  created_at: string;
}

export async function createWithdrawRequest(input: {
  userId?: string | null;
  userName?: string | null;
  amount: number;
  method: WithdrawMethod;
  accountName: string;
  accountNumber: string;
}): Promise<WithdrawRequestItem> {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .insert({
      user_id: input.userId ?? null,
      user_name: input.userName ?? null,
      amount: input.amount,
      method: input.method,
      account_name: input.accountName,
      account_number: input.accountNumber,
      status: 'قيد المراجعة',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'تعذر حفظ طلب السحب في قاعدة البيانات');
  }

  return data as WithdrawRequestItem;
}

export async function fetchUserWithdrawRequests(userId: string): Promise<WithdrawRequestItem[]> {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'تعذر جلب سجل طلبات السحب');
  }

  return (data ?? []) as WithdrawRequestItem[];
}

export async function fetchAllWithdrawRequests(): Promise<WithdrawRequestItem[]> {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'تعذر جلب طلبات السحب للوحة الإدارة');
  }

  return (data ?? []) as WithdrawRequestItem[];
}

export async function updateWithdrawStatusAndBalance(params: {
  request: WithdrawRequestItem;
  nextStatus: 'تم التحويل' | 'مرفوض';
}): Promise<void> {
  const { request, nextStatus } = params;

  const { error: updateError } = await supabase
    .from('withdraw_requests')
    .update({ status: nextStatus })
    .eq('id', request.id);

  if (updateError) {
    throw new Error(updateError.message || 'تعذر تحديث حالة طلب السحب');
  }

  if (nextStatus === 'تم التحويل' && request.user_id) {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', request.user_id)
      .single();

    if (!profileError && profileRow) {
      const currentBalance = Number(profileRow.balance ?? 0);
      const updatedBalance = Math.max(0, currentBalance - Number(request.amount));
      await supabase
        .from('profiles')
        .update({ balance: updatedBalance })
        .eq('id', request.user_id);
    }
  }
}
