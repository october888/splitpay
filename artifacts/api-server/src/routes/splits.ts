import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  splitsTable,
  paymentsTable,
  type Split as SplitRow,
  type Payment as PaymentRow,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  CreateSplitBody,
  ListRecentSplitsQueryParams,
  RecordPaymentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function nanoId(size = 10): string {
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

type SplitDto = {
  id: string;
  title?: string;
  creatorAddress: string;
  onChainId: string;
  totalAmount: string;
  participantCount: number;
  splitType: "equal" | "custom";
  customAmounts?: string[];
  txHash: string;
  paidCount: number;
  createdAt: string;
};

type PaymentDto = {
  id: string;
  splitId: string;
  payerAddress: string;
  amount: string;
  txHash: string;
  paidAt: string;
};

function toPaymentDto(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    splitId: row.splitId,
    payerAddress: row.payerAddress,
    amount: row.amount,
    txHash: row.txHash,
    paidAt: row.paidAt.toISOString(),
  };
}

function toSplitDto(row: SplitRow, paidCount: number): SplitDto {
  return {
    id: row.id,
    title: row.title ?? undefined,
    creatorAddress: row.creatorAddress,
    onChainId: row.onChainId,
    totalAmount: row.totalAmount,
    participantCount: row.participantCount,
    splitType: row.splitType,
    customAmounts: row.customAmounts ?? undefined,
    txHash: row.txHash,
    paidCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function paidCountFor(splitId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentsTable)
    .where(eq(paymentsTable.splitId, splitId));
  return row?.count ?? 0;
}

router.get("/splits", async (req, res) => {
  const parsed = ListRecentSplitsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query" });
  }
  const limit = parsed.data.limit ?? 12;

  const splits = await db
    .select()
    .from(splitsTable)
    .orderBy(desc(splitsTable.createdAt))
    .limit(limit);

  const ids = splits.map((s) => s.id);
  const counts = ids.length
    ? await db
        .select({
          splitId: paymentsTable.splitId,
          c: sql<number>`count(*)::int`,
        })
        .from(paymentsTable)
        .where(sql`${paymentsTable.splitId} = ANY(${ids})`)
        .groupBy(paymentsTable.splitId)
    : [];
  const countMap = new Map(counts.map((r) => [r.splitId, r.c]));

  res.json(splits.map((s) => toSplitDto(s, countMap.get(s.id) ?? 0)));
});

router.post("/splits", async (req, res) => {
  const parsed = CreateSplitBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "createSplit invalid body");
    return res.status(400).json({ message: "Invalid body" });
  }
  const body = parsed.data;

  const id = nanoId(10);
  const [inserted] = await db
    .insert(splitsTable)
    .values({
      id,
      title: body.title ?? null,
      creatorAddress: body.creatorAddress.toLowerCase(),
      onChainId: body.onChainId,
      totalAmount: body.totalAmount,
      participantCount: body.participantCount,
      splitType: body.splitType,
      customAmounts: body.customAmounts ?? null,
      txHash: body.txHash,
    })
    .returning();

  res.status(201).json(toSplitDto(inserted!, 0));
});

router.get("/splits/by-creator/:address", async (req, res) => {
  const address = req.params.address.toLowerCase();
  const rows = await db
    .select()
    .from(splitsTable)
    .where(eq(splitsTable.creatorAddress, address))
    .orderBy(desc(splitsTable.createdAt));

  const ids = rows.map((s) => s.id);
  const counts = ids.length
    ? await db
        .select({
          splitId: paymentsTable.splitId,
          c: sql<number>`count(*)::int`,
        })
        .from(paymentsTable)
        .where(sql`${paymentsTable.splitId} = ANY(${ids})`)
        .groupBy(paymentsTable.splitId)
    : [];
  const countMap = new Map(counts.map((r) => [r.splitId, r.c]));

  res.json(rows.map((s) => toSplitDto(s, countMap.get(s.id) ?? 0)));
});

router.get("/splits/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(splitsTable)
    .where(eq(splitsTable.id, req.params.id));
  if (!row) {
    return res.status(404).json({ message: "Not found" });
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.splitId, row.id))
    .orderBy(desc(paymentsTable.paidAt));

  res.json({
    ...toSplitDto(row, payments.length),
    payments: payments.map(toPaymentDto),
  });
});

router.get("/splits/:id/payments", async (req, res) => {
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.splitId, req.params.id))
    .orderBy(desc(paymentsTable.paidAt));
  res.json(payments.map(toPaymentDto));
});

router.post("/splits/:id/payments", async (req, res) => {
  const parsed = RecordPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid body" });
  }
  const body = parsed.data;

  const [split] = await db
    .select()
    .from(splitsTable)
    .where(eq(splitsTable.id, req.params.id));
  if (!split) {
    return res.status(404).json({ message: "Split not found" });
  }

  const payerAddress = body.payerAddress.toLowerCase();

  const [existing] = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.splitId, split.id),
        eq(paymentsTable.payerAddress, payerAddress),
      ),
    );
  if (existing) {
    return res.status(201).json(toPaymentDto(existing));
  }

  const id = nanoId(12);
  const [inserted] = await db
    .insert(paymentsTable)
    .values({
      id,
      splitId: split.id,
      payerAddress,
      amount: body.amount,
      txHash: body.txHash,
    })
    .returning();

  res.status(201).json(toPaymentDto(inserted!));
});

export default router;
