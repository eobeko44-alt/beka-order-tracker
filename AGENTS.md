<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Store pages live in `src/views/*` and are mounted by thin route files in `src/routes/*`; keep routing in TanStack routes (old `#/path` links are redirected in `__root.tsx`).
- The public catalog loads through the `getCatalog` server function (`src/lib/catalog.functions.ts`) + `catalogQueryOptions`, so SSR works without a session.
- Signed-in data (orders, top-ups, profiles, admin) is read from the browser client and protected by RLS; owner access comes only from `public.user_roles` via `is_owner()`, never from profile fields.
- Order prices are set by the `orders_set_amount` database trigger and money moves only inside `review_order` / `review_topup` / `place_wallet_order` (only wallet-paid orders deduct balance); never compute or write amounts or balances from the client.
- Receipt images go to the private `receipts` bucket and are shown to owners with short-lived signed URLs.
- Component styling was ported from the original store and uses the `brand-*`, `electric-*` and `surface` tokens defined in `src/styles.css`; add new colors there, not inline.
- Store owners are granted automatically from the private `owner_email_allowlist` table (trigger on confirmed auth users); add admin emails there instead of hand-inserting roles, so access applies whenever that account signs up.
- Home-page reviews load through the `getPublicReviews` server function (published rows only, returns empty on failure); customers review only via the `submit_review` database function (own completed order, once, starts pending), while owners publish/hide/add reviews directly under RLS — keeps fake or unapproved reviews off the public page.
- Phone sign-in has no SMS: `startPhoneLogin` creates a 6-digit code the customer sends to the store on WhatsApp, an owner approves it in the admin "طلبات الدخول" tab (`review_phone_login`), and `checkPhoneLogin` then returns a one-time magic-link token for an internal `@phone.beka-store.app` account — the owner check of the sender's number is what proves phone ownership, so never auto-approve.
- Public order tracking (`/track`) goes only through the `track_orders` database function (order number = first 8 chars of the order id, or player ID; returns status/game/package/dates only, max 10 rows); guests still have no direct read on `orders`, and the checkout creates the order id client-side so guests see their order number.
- Loyalty points are awarded only inside `review_order` on approval of a signed-in customer's order, using `public.loyalty_points_for` (amount recorded in `orders.points_awarded`); `src/lib/loyalty.ts` mirrors the rate and reward target for display only, so change the SQL function and that file together.
- This database grants full table privileges to `anon`/`authenticated` by default, so every new public table's migration must `REVOKE ALL ... FROM anon, authenticated` before its narrow GRANTs — otherwise column-limited grants (e.g. profile balance/points) silently don't apply.
- The browser client (`src/lib/supabase.ts`) and public server functions resolve the database via `getSupabaseConfig()` (`src/integrations/supabase/env.ts`), so `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set on Vercel switch the store to the owner's own project while the Lovable preview keeps its built-in backend; never import the generated client directly in app code.
- Google sign-in calls `supabase.auth.signInWithOAuth` directly with `redirectTo: authRedirectUrl()` (`src/lib/config.ts`, main site `SITE_URL`) so it works on Vercel; it needs the project's own Google client ID/secret and the site in the allowed redirect URLs.
- `docs/own-supabase-setup.sql` is all migrations concatenated for setting up the owner's own project; regenerate it whenever a migration is added.
