import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  balance: number;
  points: number;
}

const PROFILE_COLUMNS = 'id, name, email, phone, avatar_url, balance, points';

function toProfile(row: ProfileRow, ownerIds: Set<string>): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: ownerIds.has(row.id) ? 'owner' : 'customer',
    balance: row.balance,
    points: row.points,
  };
}

async function fetchOwnerIds(userId?: string): Promise<Set<string>> {
  let query = supabase.from('user_roles').select('user_id').eq('role', 'owner');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.user_id));
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const [{ data, error }, ownerIds] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    fetchOwnerIds(userId),
  ]);
  if (error) throw new Error(error.message);
  return data ? toProfile(data as ProfileRow, ownerIds) : null;
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const [{ data, error }, ownerIds] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at', { ascending: false }),
    fetchOwnerIds(),
  ]);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Unexpected response');
  return (data as ProfileRow[]).map((row) => toProfile(row, ownerIds));
}
