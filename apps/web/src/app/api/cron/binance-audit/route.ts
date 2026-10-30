import { NextResponse } from "next/server";
import { runBinanceAudit } from "@/lib/runBinanceAudit";

export async function GET(req: Request) {
  // Vercel sends this header for cron jobs in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBinanceAudit("cron");
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, auditId: result.auditId, status: result.status, discrepancyUsd: result.discrepancyUsd });
}
