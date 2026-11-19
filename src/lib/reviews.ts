import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getPublicReviews } from '@/lib/reviews.functions';
import type { AdminReview, ReviewStatus } from '@/types';

export const REVIEW_COMMENT_MIN = 3;
export const REVIEW_COMMENT_MAX = 400;
export const REVIEW_NAME_MIN = 2;
export const REVIEW_NAME_MAX = 40;

export const publicReviewsQueryOptions = queryOptions({
  queryKey: ['public-reviews'],
  queryFn: () => getPublicReviews(),
  staleTime: 60_000,
});

/** Returns an Arabic error message, or null when the review is valid. */
export function validateReview(rating: number, comment: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'اختار عدد النجوم من 1 لـ 5';
  const length = comment.trim().length;
  if (length < REVIEW_COMMENT_MIN) return 'اكتب رأيك في كلمتين على الأقل';
  if (length > REVIEW_COMMENT_MAX) return `الرأي لازم ما يزيد عن ${REVIEW_COMMENT_MAX} حرف`;
  return null;
}

export function validateReviewerName(name: string): string | null {
  const length = name.trim().length;
  if (length < REVIEW_NAME_MIN || length > REVIEW_NAME_MAX) return 'اكتب اسم العميل (من 2 لـ 40 حرف)';
  return null;
}

const REVIEW_ERRORS: Record<string, string> = {
  ALREADY_REVIEWED: 'قيّمت الطلب ده قبل كده، شكراً ليك!',
  ORDER_NOT_COMPLETED: 'تقدر تقيّم الطلب بعد ما يتنفّذ.',
  ORDER_NOT_FOUND: 'الطلب ده ما لقيناه في حسابك.',
  NOT_SIGNED_IN: 'سجّل دخولك عشان تقيّم طلبك.',
};

export function describeReviewError(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? '');
  for (const [code, text] of Object.entries(REVIEW_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return 'حصلت مشكلة، حاول مرة تانية.';
}

export async function submitReview(orderId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase.rpc('submit_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchMyReviewedOrderIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('reviews').select('order_id').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.order_id).filter((id): id is string => Boolean(id)));
}

interface ReviewRow {
  id: string;
  customer_name: string;
  game_id: string | null;
  rating: number;
  comment: string;
  source: string;
  status: string;
  order_id: string | null;
  created_at: string;
  game: { name_ar: string } | null;
}

export async function fetchAllReviews(): Promise<AdminReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, customer_name, game_id, rating, comment, source, status, order_id, created_at, game:games(name_ar)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ReviewRow[]).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    gameId: row.game_id,
    gameName: row.game?.name_ar ?? null,
    rating: row.rating,
    comment: row.comment,
    source: row.source === 'owner' ? 'owner' : 'customer',
    status: (['pending', 'approved', 'rejected'].includes(row.status) ? row.status : 'pending') as ReviewStatus,
    orderId: row.order_id,
    createdAt: row.created_at,
  }));
}

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createOwnerReview(input: {
  customerName: string;
  gameId: string | null;
  rating: number;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    customer_name: input.customerName.trim(),
    game_id: input.gameId,
    rating: input.rating,
    comment: input.comment.trim(),
    source: 'owner',
    status: 'approved',
  });
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
