import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  splitsTable,
  paymentsTable,
  participantTokensTable,
  type Split as SplitRow,
  type Payment as PaymentRow,
  type ParticipantToken as ParticipantTokenRow,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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

function generateParticipantToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

type ParticipantSlot = {
  index: number;
  token: string;
  name?: string;
  amount: string;
  paid: boolean;
  payerAddress?: string;
  paidAt?: string;
};

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
  participants?: ParticipantSlot[];
};

type PaymentDto = {
  id: string;
  splitId: string;
  payerAddress: string;
  amount: string;
  txHash: string;
  paidAt: string;
};

type ParticipantViewDto = {
  splitId: string;
  title?: string;
  totalAmount: string;
  participantCount: number;
  splitType: "equal" | "custom";
  onChainId: string;
  txHash: string;
  participantIndex: number;
  participantAmount: string;
  participantName?: string;
  hasPaid: boolean;
  payerAddress?: string;
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

function toParticipantSlot(row: ParticipantTokenRow): ParticipantSlot {
  return {
    index: row.participantIndex,
    token: row.token,
    name: row.participantName ?? undefined,
    amount: row.participantAmount,
    paid: !!row.payerAddress,
    payerAddress: row.payerAddress ?? undefined,
    paidAt: row.paidAt?.toISOString() ?? undefined,
  };
}

function toSplitDto(
  row: SplitRow,
  paidCount: number,
  participants?: ParticipantSlot[],
): SplitDto {
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
    ...(participants ? { participants } : {}),
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
        .where(inArray(paymentsTable.splitId, ids))
        .groupBy(paymentsTable.splitId)
    : [];
  const countMap = new Map(counts.map((r) => [r.splitId, r.c]));

  return res.json(splits.map((s) => toSplitDto(s, countMap.get(s.id) ?? 0)));
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

  const split = inserted!;

  const perPerson =
    split.splitType === "equal"
      ? (BigInt(split.totalAmount) / BigInt(split.participantCount)).toString()
      : null;

  const slots: ParticipantSlot[] = [];
  for (let i = 0; i < split.participantCount; i++) {
    const token = generateParticipantToken();
    const amount =
      split.splitType === "custom" && split.customAmounts
        ? (split.customAmounts[i] ?? perPerson ?? "0")
        : perPerson ?? "0";
    const name = body.participantNames?.[i] || undefined;

    await db.insert(participantTokensTable).values({
      token,
      splitId: split.id,
      participantIndex: i,
      participantAmount: amount,
      participantName: name ?? null,
    });

    slots.push({ index: i, token, name, amount, paid: false });
  }

  return res.status(201).json(toSplitDto(split, 0, slots));
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
        .where(inArray(paymentsTable.splitId, ids))
        .groupBy(paymentsTable.splitId)
    : [];
  const countMap = new Map(counts.map((r) => [r.splitId, r.c]));

  res.json(rows.map((s) => toSplitDto(s, countMap.get(s.id) ?? 0)));
});

router.get("/splits/by-token/:token", async (req, res) => {
  const token = req.params.token;

  const [tokenRow] = await db
    .select()
    .from(participantTokensTable)
    .where(eq(participantTokensTable.token, token));

  if (!tokenRow) {
    return res.status(404).json({ message: "Token not found" });
  }

  const [split] = await db
    .select()
    .from(splitsTable)
    .where(eq(splitsTable.id, tokenRow.splitId));

  if (!split) {
    return res.status(404).json({ message: "Split not found" });
  }

  const view: ParticipantViewDto = {
    splitId: split.id,
    title: split.title ?? undefined,
    totalAmount: split.totalAmount,
    participantCount: split.participantCount,
    splitType: split.splitType,
    onChainId: split.onChainId,
    txHash: split.txHash,
    participantIndex: tokenRow.participantIndex,
    participantAmount: tokenRow.participantAmount,
    participantName: tokenRow.participantName ?? undefined,
    hasPaid: !!tokenRow.payerAddress,
    payerAddress: tokenRow.payerAddress ?? undefined,
  };

  return res.json(view);
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

  const tokenRows = await db
    .select()
    .from(participantTokensTable)
    .where(eq(participantTokensTable.splitId, row.id))
    .orderBy(participantTokensTable.participantIndex);

  const participants = tokenRows.map(toParticipantSlot);

  return res.json({
    ...toSplitDto(row, payments.length, participants),
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
  const token = (body as any).token as string | undefined;

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

  const pmtId = nanoId(12);
  const [pmtInserted] = await db
    .insert(paymentsTable)
    .values({
      id: pmtId,
      splitId: split.id,
      payerAddress,
      amount: body.amount,
      txHash: body.txHash,
    })
    .returning();

  if (token) {
    await db
      .update(participantTokensTable)
      .set({ payerAddress, paidAt: new Date() })
      .where(
        and(
          eq(participantTokensTable.token, token),
          eq(participantTokensTable.splitId, split.id),
        ),
      );
  } else {
    const [unclaimedToken] = await db
      .select()
      .from(participantTokensTable)
      .where(
        and(
          eq(participantTokensTable.splitId, split.id),
          sql`${participantTokensTable.payerAddress} IS NULL`,
        ),
      )
      .orderBy(participantTokensTable.participantIndex)
      .limit(1);

    if (unclaimedToken) {
      await db
        .update(participantTokensTable)
        .set({ payerAddress, paidAt: new Date() })
        .where(eq(participantTokensTable.token, unclaimedToken.token));
    }
  }

  return res.status(201).json(toPaymentDto(pmtInserted!));
});

export default router;
