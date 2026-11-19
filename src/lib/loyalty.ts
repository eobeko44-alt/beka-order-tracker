// Loyalty points. Awarding happens only in the database (`review_order` via `loyalty_points_for`);
// these values mirror it for display. Change both together.

/** SDG of a completed order that earn one loyalty point. */
export const SDG_PER_POINT = 2000;

/** Points a customer needs to earn a top-up code. */
export const TOPUP_CODE_POINTS = 100;

export function pointsForOrder(amountSdg: number): number {
  return Math.floor(Math.max(amountSdg, 0) / SDG_PER_POINT);
}

export interface LoyaltyProgress {
  points: number;
  target: number;
  remaining: number;
  /** 0–100, for the progress bar. */
  percent: number;
  reached: boolean;
}

export function loyaltyProgress(points: number, target = TOPUP_CODE_POINTS): LoyaltyProgress {
  const safe = Math.max(points, 0);
  return {
    points: safe,
    target,
    remaining: Math.max(target - safe, 0),
    percent: Math.min(Math.round((safe / target) * 100), 100),
    reached: safe >= target,
  };
}
