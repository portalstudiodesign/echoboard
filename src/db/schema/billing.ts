import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "./auth";

/**
 * Local mirror of each workspace's Stripe subscription. Stripe stays the source of truth;
 * this row is rewritten from Stripe's own objects (webhooks + checkout return), never edited by hand.
 */
export const subscription = pgTable(
  "subscription",
  {
    organizationId: text()
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    stripeCustomerId: text().notNull(),
    stripeSubscriptionId: text(),
    // Stripe's status string: active, trialing, past_due, canceled, incomplete, unpaid, …
    status: text().notNull().default("none"),
    priceLookupKey: text(),
    currentPeriodEnd: timestamp({ withTimezone: true }),
    // When a scheduled cancellation takes effect (null = renews).
    cancelAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("subscription_customer_uidx").on(table.stripeCustomerId)],
);
