import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { splitsTable, paymentsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { appConfig } from "../lib/config";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  const [splits] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(splitsTable);
  const [payments] = await db
    .select({
      count: sql<number>`count(*)::int`,
      sum: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
    })
    .from(paymentsTable);

  // Split is "active" if it isn't fully paid (paid_count < participant_count).
  const activeRes = await db.execute(sql`
    select count(*)::int as count
    from ${splitsTable} s
    left join (
      select split_id, count(*)::int as paid
      from ${paymentsTable}
      group by split_id
    ) p on p.split_id = s.id
    where coalesce(p.paid, 0) < s.participant_count
  `);
  const activeRows =
    (activeRes as unknown as { rows?: Array<{ count: number }> }).rows ??
    (activeRes as unknown as Array<{ count: number }>);
  const activeCount = Number(activeRows?.[0]?.count ?? 0);

  res.json({
    totalSplits: splits?.count ?? 0,
    totalVolume: String(payments?.sum ?? "0"),
    totalParticipantsPaid: payments?.count ?? 0,
    activeSplits: activeCount,
  });
});

router.get("/config", (_req, res) => {
  res.json(appConfig);
});

export default router;
