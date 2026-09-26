export type Plan = "free" | "pro";

export const planLimits = {
  free: { boards: 1, teamSeats: 3, showBranding: true },
  pro: { boards: Number.POSITIVE_INFINITY, teamSeats: Number.POSITIVE_INFINITY, showBranding: false },
} as const satisfies Record<Plan, { boards: number; teamSeats: number; showBranding: boolean }>;

/** The one paid price. Found by lookup key, so no Stripe IDs need to live in config. */
export const proPrice = {
  lookupKey: "echoboard_pro_monthly",
  productName: "Echoboard Pro",
  unitAmount: 1900,
  currency: "usd",
  interval: "month",
} as const;

/**
 * Which Stripe statuses unlock Pro. `past_due` keeps Pro while Stripe retries the card
 * (a grace period); `canceled`, `unpaid` and `incomplete*` fall back to Free.
 */
export function planFromStatus(status: string | null | undefined): Plan {
  return status === "active" || status === "trialing" || status === "past_due" ? "pro" : "free";
}
