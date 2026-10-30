import { db, households, incomeSources, users, binanceAudits, binanceCorrections, notifications } from "@repo/db";
import { applyBinanceAdjustment } from "./applyBinanceAdjustment";
import { eq, and, or, ilike } from "drizzle-orm";
import { getBinanceUsdtBalances } from "./binanceApi";
import { getAppFundTotal } from "./appFundTotal";

export type AuditStatus = "green" | "yellow" | "orange" | "red";

export function getDiscrepancyStatus(discrepancy: number): AuditStatus {
  // discrepancy = appTotal - binanceTotal
  // Negative = Binance has more (favorable) → always green
  // Positive = App has more than Binance (problem) → escalates by amount
  if (discrepancy < 3) return "green";   // Binance tiene más, o diferencia < $3
  if (discrepancy < 5) return "yellow";  // $3.00 – $4.99
  if (discrepancy < 20) return "orange"; // $5.00 – $19.99
  return "red";                          // $20+
}

const STATUS_EMOJI: Record<AuditStatus, string> = {
  green: "✅",
  yellow: "⚠️",
  orange: "🟠",
  red: "🔴",
};

export async function runBinanceAudit(triggeredBy: "cron" | "manual"): Promise<{
  auditId: string;
  status: AuditStatus;
  discrepancyUsd: number;
  error?: string;
}> {
  // Only for main household
  const [mainHousehold] = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.isMain, true));

  if (!mainHousehold) {
    return { auditId: "", status: "red", discrepancyUsd: 0, error: "No se encontró la instancia principal" };
  }

  const hid = mainHousehold.id;

  // Fetch Binance balances
  const { spot, funding, error: binanceError } = await getBinanceUsdtBalances();
  if (binanceError && spot === 0 && funding === 0) {
    return { auditId: "", status: "red", discrepancyUsd: 0, error: binanceError };
  }

  const binanceTotal = spot + funding;
  const appTotal = await getAppFundTotal(hid);
  const discrepancyUsd = appTotal - binanceTotal;
  const status = getDiscrepancyStatus(discrepancyUsd);

  // Insert audit record
  const insertedAudits = await db.insert(binanceAudits).values({
    householdId: hid,
    binanceSpotUsdt: String(spot),
    binanceFundUsdt: String(funding),
    binanceTotalUsdt: String(binanceTotal),
    appTotalUsdt: String(appTotal),
    discrepancyUsd: String(discrepancyUsd),
    status,
    triggeredBy,
  }).returning();

  const audit = insertedAudits[0];
  if (!audit) {
    return { auditId: "", status, discrepancyUsd, error: "Error al guardar auditoría" };
  }

  // Auto-correct for green/yellow
  let autoCorrectApplied = false;
  if (status === "green" || status === "yellow") {
    const [defaultFund] = await db
      .select({ id: incomeSources.id, name: incomeSources.name })
      .from(incomeSources)
      .where(and(eq(incomeSources.householdId, hid), eq(incomeSources.isActive, true), ilike(incomeSources.name, "%cencosud%")));

    const [defaultMember] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "amilcar.laniakea@gmail.com"));

    if (defaultFund && defaultMember) {
      const adjustment = -discrepancyUsd;
      await db.insert(binanceCorrections).values({
        auditId: audit.id,
        fundId: defaultFund.id,
        memberId: defaultMember.id,
        adjustmentUsd: String(adjustment),
        tag: "auto-cron",
        notes: `Corrección automática aplicada por ${triggeredBy}`,
        status,
        isAutomatic: "true",
        correctedBy: defaultMember.id,
      });

      // Apply the adjustment to real fund/member balances
      await applyBinanceAdjustment({
        householdId: hid,
        fundId: defaultFund.id,
        memberId: defaultMember.id,
        adjustmentUsd: adjustment,
        tag: "auto-cron",
      });

      autoCorrectApplied = true;
    }
  }

  // Notify all admin/superadmin users only
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.role, "admin"), eq(users.role, "superadmin")));

  const emoji = STATUS_EMOJI[status];
  let title: string;
  let body: string;

  if (autoCorrectApplied) {
    title = `${emoji} Corrección automática aplicada`;
    body = `Discrepancia $${Math.abs(discrepancyUsd).toFixed(2)} [${status}] ajustada automáticamente en WITI-CENCOSUD / amilcar. Binance: $${binanceTotal.toFixed(2)} | App: $${appTotal.toFixed(2)}`;
  } else {
    title = `${emoji} Auditoría Binance — ${status.toUpperCase()}`;
    body = `Binance: $${binanceTotal.toFixed(2)} | App: $${appTotal.toFixed(2)} | Diferencia: $${discrepancyUsd.toFixed(2)}${status !== "green" ? " — requiere corrección manual" : ""}`;
  }

  if (adminUsers.length > 0) {
    await db.insert(notifications).values(
      adminUsers.map((u) => ({
        userId: u.id,
        type: "binance-audit",
        title,
        body,
        data: { auditId: audit.id, status, discrepancyUsd, link: "/dashboard/audit" },
      }))
    );
  }

  return { auditId: audit.id, status, discrepancyUsd };
}
