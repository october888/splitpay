import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const splitsTable = pgTable(
  "splits",
  {
    id: text("id").primaryKey(),
    title: text("title"),
    creatorAddress: text("creator_address").notNull(),
    onChainId: text("on_chain_id").notNull(),
    totalAmount: text("total_amount").notNull(),
    participantCount: integer("participant_count").notNull(),
    splitType: text("split_type").$type<"equal" | "custom">().notNull(),
    customAmounts: jsonb("custom_amounts").$type<string[] | null>(),
    txHash: text("tx_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    onChainIdx: uniqueIndex("splits_on_chain_id_idx").on(t.onChainId),
  }),
);

export const paymentsTable = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    splitId: text("split_id")
      .notNull()
      .references(() => splitsTable.id, { onDelete: "cascade" }),
    payerAddress: text("payer_address").notNull(),
    amount: text("amount").notNull(),
    txHash: text("tx_hash").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniquePayer: uniqueIndex("payments_split_payer_idx").on(
      t.splitId,
      t.payerAddress,
    ),
  }),
);

export const participantTokensTable = pgTable(
  "participant_tokens",
  {
    token: text("token").primaryKey(),
    splitId: text("split_id")
      .notNull()
      .references(() => splitsTable.id, { onDelete: "cascade" }),
    participantIndex: integer("participant_index").notNull(),
    participantAmount: text("participant_amount").notNull(),
    participantName: text("participant_name"),
    payerAddress: text("payer_address"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    splitIdx: index("participant_tokens_split_id_idx").on(t.splitId),
  }),
);

export const insertSplitSchema = createInsertSchema(splitsTable);
export type InsertSplit = z.infer<typeof insertSplitSchema>;
export type Split = typeof splitsTable.$inferSelect;

export const insertPaymentSchema = createInsertSchema(paymentsTable);
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

export type ParticipantToken = typeof participantTokensTable.$inferSelect;
