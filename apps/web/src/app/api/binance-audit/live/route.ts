import { NextResponse } from "next/server";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { getBinanceUsdtBalances } from "@/lib/binanceApi";
import { getAppFundTotal } from "@/lib/appFundTotal";
import { getDiscrepancyStatus } from "@/lib/runBinanceAudit";

export async function GET() {
  const ctx = await getInstanceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "admin" && ctx.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ctx.activeHousehold.isMain) {
    return NextResponse.json({ error: "Solo disponible para la instancia principal" }, { status: 403 });
  }

  const [binance, appTotal] = await Promise.all([
    getBinanceUsdtBalances(),
    getAppFundTotal(ctx.activeHousehold.id),
  ]);

  const binanceTotal = binance.spot + binance.funding;
  const discrepancy = appTotal - binanceTotal;
  const status = getDiscrepancyStatus(discrepancy);

  return NextResponse.json({
    spot: binance.spot,
    funding: binance.funding,
    total: binanceTotal,
    appTotal,
    discrepancy,
    status,
    error: binance.error ?? null,
    fundingNote: binance.fundingNote ?? null,
    fetchedAt: new Date().toISOString(),
  });
}
