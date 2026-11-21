import { LogOut, ShieldCheck, UserRound, MessageCircle } from "lucide-react";
import SignInPanel from "@/components/wallet/SignInPanel";
import StatusScreen from "@/components/StatusScreen";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { STORE_CONTACT_DISPLAY } from "@/lib/config";
import { buildWhatsAppUrl } from "@/lib/format";
import { signOutUser } from "@/lib/auth";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { describeAuthError } from "@/lib/authErrors";
import { useState } from "react";

const ADMIN_EMAILS = ["abobaker096605@gmail.com"];
const ADMIN_PHONES = ["0114071454", "0966052295"];

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading, isOwner } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (isLoading) return <StatusScreen title="جاري تحميل حسابك..." loading />;
  if (!user) return <SignInPanel />;

  const userEmail = (user.email ?? "").trim().toLowerCase();
  const rawPhone = (profile?.phone ?? user.phone ?? "").replace(/\D/g, "");
  const canAccessAdmin = Boolean(
    isOwner ||
      (userEmail && ADMIN_EMAILS.includes(userEmail)) ||
      ADMIN_PHONES.some((p) => rawPhone.endsWith(p))
  );

  const displayName = profile?.name?.trim() || "عميلنا العزيز";
  const contact = isPhoneLoginEmail(user.email)
    ? null
    : user.email || profile?.phone || user.phone || "";

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOutUser();
    } catch (err) {
      setSignOutError(describeAuthError(err));
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <section className="flex flex-col gap-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 animate-fade-up sm:flex">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1">
            <UserRound className="h-7 w-7" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-lg font-bold text-zinc-50">{displayName}</p>
            <p dir="ltr" className="truncate text-start text-sm text-zinc-400">
              {contact}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canAccessAdmin && (
            <button
              type="button"
              onClick={() => void navigate({ to: "/beko-admin-2026" })}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <ShieldCheck className="h-4 w-4" />
              لوحة الإدارة
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>

        {signOutError && (
          <p role="alert" className="text-sm text-red-400">
            {signOutError}
          </p>
        )}
      </section>

      <a
        href={buildWhatsAppUrl()}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-bold text-zinc-50">الدعم عبر واتساب</span>
            <span dir="ltr" className="text-xs text-zinc-400">
              {STORE_CONTACT_DISPLAY}
            </span>
          </span>
        </span>
      </a>
    </div>
  );
}
