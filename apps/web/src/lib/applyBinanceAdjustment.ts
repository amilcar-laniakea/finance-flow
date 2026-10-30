import { db, expenses, incomes, incomeDistributions } from "@repo/db";

/**
 * Creates a real financial record so the audit correction is reflected in fund/member balances.
 *
 * adjustmentUsd < 0 → app had MORE than Binance → create expense (reduces fund + member)
 * adjustmentUsd > 0 → Binance had MORE than app → create income + distribution (adds to fund + member)
 */
export async function applyBinanceAdjustment({
  householdId,
  fundId,
  memberId,
  adjustmentUsd,
  tag,
}: {
  householdId: string;
  fundId: string;
  memberId: string;
  adjustmentUsd: number;
  tag?: string | null;
}) {
  const now = new Date();
  const label = tag ? `Ajuste Binance — ${tag}` : "Ajuste de conciliación Binance";

  if (adjustmentUsd < 0) {
    // Reduce app balance: create expense on the fund for the member
    await db.insert(expenses).values({
      householdId,
      memberId,
      amountUsd: String(Math.abs(adjustmentUsd)),
      description: label,
      incomeSourceId: fundId,
      period: now,
      createdBy: memberId,
      isRecurring: false,
    });
  } else if (adjustmentUsd > 0) {
    // Increase app balance: create income on the fund + distribute to member
    const [income] = await db.insert(incomes).values({
      householdId,
      sourceId: fundId,
      amountUsd: String(adjustmentUsd),
      description: label,
      period: now,
      createdBy: memberId,
    }).returning({ id: incomes.id });

    if (income) {
      await db.insert(incomeDistributions).values({
        incomeId: income.id,
        memberId,
        amountUsd: String(adjustmentUsd),
      });
    }
  }
}
