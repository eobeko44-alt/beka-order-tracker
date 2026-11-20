import { supabase } from "../supabase/client";

export type AuthProvider = "google" | "apple" | "github" | "azure" | string;

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: AuthProvider, opts?: SignInOptions) => {
      try {
        const redirectTo =
          opts?.redirect_uri ||
          (typeof window !== "undefined" ? window.location.origin : undefined);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: provider as Parameters<
            typeof supabase.auth.signInWithOAuth
          >[0]["provider"],
          options: {
            ...(redirectTo ? { redirectTo } : {}),
            ...(opts?.extraParams ? { queryParams: opts.extraParams } : {}),
          },
        });

        if (error) {
          return { error };
        }

        return { data, redirected: Boolean(data?.url) };
      } catch (e) {
        return {
          error: e instanceof Error ? e : new Error(String(e)),
        };
      }
    },
  },
};
