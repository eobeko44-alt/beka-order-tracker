import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/lib/profiles';
import type { UserProfile } from '@/types';

function buildFallbackProfile(authUser: User): UserProfile {
  const metaName =
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name) ||
    (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name) ||
    authUser.email?.split('@')[0] ||
    'عميلنا العزيز';

  return {
    id: authUser.id,
    name: metaName,
    email: authUser.email ?? '',
    balance: 0,
    points: 0,
    role: 'user',
  } as UserProfile;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (authUser: User) => {
    try {
      const loaded = await fetchProfile(authUser.id);
      setProfile(loaded ?? buildFallbackProfile(authUser));
    } catch {
      setProfile(buildFallbackProfile(authUser));
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function syncSession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);

      if (nextSession?.user) {
        await loadProfile(nextSession.user);
      } else {
        setProfile(null);
      }

      if (active) {
        setIsLoading(false);
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        void syncSession(nextSession);
      }, 0);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user);
    }
  }, [session, loadProfile]);

  const user: User | null = session?.user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isOwner: profile?.role === 'owner',
      refreshProfile,
    }),
    [session, user, profile, isLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
