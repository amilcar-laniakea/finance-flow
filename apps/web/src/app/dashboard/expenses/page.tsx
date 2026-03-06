import { db, expenses, users, incomeSources, incomes, expenseSourceSplits, expenseTypeAmounts, expenseTypes } from "@repo/db";
import { isNull, desc, eq, and, sql, inArray } from "drizzle-orm";
import { AddExpenseModal } from "./_components/AddExpenseModal";
import { EditExpenseModal } from "./_components/EditExpenseModal";
import { DeleteExpenseButton } from "./_components/DeleteExpenseButton";

export default async function ExpensesPage() {
  const [rows, members, rawSources, rawTypes] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(isNull(expenses.deletedAt))
      .orderBy(desc(expenses.occurredAt))
      .limit(100),
    db.select({ id: users.id, nickname: users.fullName }).from(users).orderBy(users.fullName),
    db
      .select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources)
      .where(eq(incomeSources.isActive, true))
      .orderBy(incomeSources.name),
    db.select().from(expenseTypes).orderBy(expenseTypes.name),
  ]);

  // Compute balance per source
  const sources = await Promise.all(
    rawSources.map(async (s) => {
      const [inc] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(incomes)
        .where(and(eq(incomes.sourceId, s.id), isNull(incomes.deletedAt)));

      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const [spl] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)` })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(and(eq(expenseSourceSplits.incomeSourceId, s.id), isNull(expenses.deletedAt)));

      const balance =
        parseFloat(inc?.total ?? "0") -
        parseFloat(exp?.total ?? "0") -
        parseFloat(spl?.total ?? "0");

      return { ...s, balance };
    })
  );

  // Fetch splits for visible rows (for fund-level totals in footer)
  const expIds = rows.map((r) => r.id);
  const allSplits = expIds.length > 0
    ? await db
        .select({
          expenseId: expenseSourceSplits.expenseId,
          incomeSourceId: expenseSourceSplits.incomeSourceId,
          amountUsd: expenseSourceSplits.amountUsd,
        })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(and(inArray(expenseSourceSplits.expenseId, expIds), isNull(expenses.deletedAt)))
    : [];

  const splitExpenseIds = new Set(allSplits.map((s) => s.expenseId));

  // Group splits by expenseId for the edit modal
  const splitsByExpense = new Map<string, { incomeSourceId: string; amountUsd: string }[]>();
  for (const s of allSplits) {
    if (!splitsByExpense.has(s.expenseId)) splitsByExpense.set(s.expenseId, []);
    splitsByExpense.get(s.expenseId)!.push({ incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd });
  }

  // Fetch type amounts for visible rows
  const allTypeAmounts = expIds.length > 0
    ? await db
        .select({
          expenseId: expenseTypeAmounts.expenseId,
          expenseTypeId: expenseTypeAmounts.expenseTypeId,
          amount: expenseTypeAmounts.amount,
        })
        .from(expenseTypeAmounts)
        .where(inArray(expenseTypeAmounts.expenseId, expIds))
    : [];

  // Group type amounts by expenseId for the edit modal
  const typeAmountsByExpense = new Map<string, { expenseTypeId: string; amount: string }[]>();
  for (const ta of allTypeAmounts) {
    if (!typeAmountsByExpense.has(ta.expenseId)) typeAmountsByExpense.set(ta.expenseId, []);
    typeAmountsByExpense.get(ta.expenseId)!.push({ expenseTypeId: ta.expenseTypeId, amount: ta.amount });
  }

  // --- Footer totals ---
  // By fund
  const fundTotals = new Map<string, number>();
  for (const s of allSplits) {
    fundTotals.set(s.incomeSourceId, (fundTotals.get(s.incomeSourceId) ?? 0) + parseFloat(s.amountUsd));
  }
  for (const e of rows) {
    if (e.incomeSourceId && !splitExpenseIds.has(e.id)) {
      fundTotals.set(e.incomeSourceId, (fundTotals.get(e.incomeSourceId) ?? 0) + parseFloat(e.amountUsd));
    }
  }

  // Build type lookup map
  const typeMap = Object.fromEntries(rawTypes.map((t) => [t.id, t]));

  // By type — keyed by expenseTypeId
  const typeTotals = new Map<string, number>();
  for (const ta of allTypeAmounts) {
    typeTotals.set(ta.expenseTypeId, (typeTotals.get(ta.expenseTypeId) ?? 0) + parseFloat(ta.amount));
  }

  // Grand totals
  const grandTotalUsd = rows.reduce((sum, e) => sum + parseFloat(e.amountUsd), 0);
  const grandTotalBs = rows.reduce((sum, e) => sum + parseFloat(e.amountBs ?? "0"), 0);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.nickname ?? "—"]));
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  // Type summary (used in footer) — keyed by expenseTypeId
  const classifiedTotal = [...typeTotals.values()].reduce((s, v) => s + v, 0);
  const unclassifiedTotal = grandTotalUsd - classifiedTotal;
  const sortedTypes = [...typeTotals.entries()].sort((a, b) => b[1] - a[1]);

  // By member
  const memberTotals = new Map<string, { name: string; total: number }>();
  for (const e of rows) {
    if (e.memberId) {
      const name = memberMap[e.memberId] ?? "—";
      const prev = memberTotals.get(e.memberId) ?? { name, total: 0 };
      memberTotals.set(e.memberId, { name, total: prev.total + parseFloat(e.amountUsd) });
    }
  }
  const sortedMembers = [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total);
  const unassignedTotal = rows
    .filter((e) => !e.memberId)
    .reduce((s, e) => s + parseFloat(e.amountUsd), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Gastos</h1>
        <AddExpenseModal members={members} sources={sources} expenseTypes={rawTypes} />
      </div>

      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
        {rows.length === 0 ? (
          <p style={{ padding: "32px", color: "#94A3B8", textAlign: "center" }}>
            Aún no hay gastos. ¡Agrega el primero!
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", background: "#F8FAFC" }}>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Descripción</th>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Tipo</th>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Comercio</th>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Miembro</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>USD</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>Bs</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>Fecha</th>
                <th style={{ textAlign: "center", padding: "12px 16px", width: "80px" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const src = e.incomeSourceId ? sourceMap[e.incomeSourceId] : null;
                const expTypAmts = typeAmountsByExpense.get(e.id) ?? [];

                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 500 }}>{e.description}</span>
                      {src && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginLeft: "8px",
                          fontSize: "11px",
                          padding: "1px 7px",
                          borderRadius: "99px",
                          background: "#F0FDF4",
                          color: "#16A34A",
                        }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: src.color ?? "#16A34A", display: "inline-block" }} />
                          {src.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {expTypAmts.length === 0 ? (
                        <span style={{ color: "#CBD5E1", fontSize: "12px" }}>—</span>
                      ) : (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {expTypAmts.map((ta, i) => {
                            const tinfo = typeMap[ta.expenseTypeId];
                            const tcolor = tinfo?.color ?? "#7C3AED";
                            return (
                              <span key={i} style={{
                                fontSize: "11px", padding: "1px 7px", borderRadius: "99px",
                                background: `${tcolor}22`,
                                color: tcolor, fontWeight: 600, whiteSpace: "nowrap",
                              }}>
                                {tinfo?.name ?? "?"} · ${parseFloat(ta.amount).toFixed(2)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748B" }}>{e.merchant ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {e.memberId ? (
                        <span style={{ fontSize: "12px", background: "#F1F5F9", color: "#475569", padding: "2px 8px", borderRadius: "99px" }}>
                          {memberMap[e.memberId] ?? "—"}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#DC2626", fontWeight: 700 }}>
                      ${e.amountUsd}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94A3B8" }}>
                      {e.amountBs ? `${e.amountBs} Bs` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748B" }}>
                      {e.occurredAt ? new Date(e.occurredAt).toLocaleDateString("es-VE") : "—"}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                        <EditExpenseModal
                          expense={{
                            id: e.id,
                            description: e.description,
                            merchant: e.merchant,
                            memberId: e.memberId,
                            amountUsd: e.amountUsd,
                            amountBs: e.amountBs,
                            exchangeRate: e.exchangeRate,
                            period: e.period,
                          }}
                          expenseSplits={(splitsByExpense.get(e.id) ?? []).map((s) => ({
                            incomeSourceId: s.incomeSourceId,
                            amountUsd: s.amountUsd,
                            sourceName: sourceMap[s.incomeSourceId]?.name ?? s.incomeSourceId,
                            sourceColor: sourceMap[s.incomeSourceId]?.color ?? null,
                          }))}
                          initialTypeAmounts={typeAmountsByExpense.get(e.id) ?? []}
                          members={members}
                          sources={sources}
                          expenseTypes={rawTypes}
                        />
                        <DeleteExpenseButton id={e.id} label={e.description} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Summary footer ── */}
      {rows.length > 0 && (
        <div style={{
          marginTop: "24px",
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>
              Resumen de gastos ({rows.length} registros)
            </span>
            <span style={{ fontSize: "13px", color: "#64748B" }}>
              últimos 100 movimientos
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {/* By fund */}
            <div style={{ padding: "20px", borderRight: "1px solid #F1F5F9" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                Por fondo
              </p>
              {fundTotals.size === 0 ? (
                <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin asignación de fondos</p>
              ) : (
                [...fundTotals.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([sourceId, total]) => {
                    const src = sourceMap[sourceId];
                    return (
                      <div key={sourceId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: src?.color ?? "#94A3B8", flexShrink: 0, display: "inline-block" }} />
                          {src?.name ?? sourceId}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>

            {/* By type */}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Por tipo
                </p>
                {classifiedTotal > 0 && (
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                    ${classifiedTotal.toFixed(2)} clasificado de ${grandTotalUsd.toFixed(2)}
                  </span>
                )}
              </div>

              {typeTotals.size === 0 ? (
                <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin clasificación por tipo</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {sortedTypes.map(([expenseTypeId, total]) => {
                    const tinfo = typeMap[expenseTypeId];
                    const tname = tinfo?.name ?? "?";
                    const tcolor = tinfo?.color ?? "#7C3AED";
                    const pct = classifiedTotal > 0 ? (total / classifiedTotal) * 100 : 0;
                    return (
                      <div key={expenseTypeId}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{
                            fontSize: "12px", padding: "1px 8px", borderRadius: "99px",
                            background: `${tcolor}22`, color: tcolor, fontWeight: 600,
                          }}>
                            {tname}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#94A3B8" }}>{pct.toFixed(1)}%</span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>${total.toFixed(2)}</span>
                          </span>
                        </div>
                        <div style={{ height: "4px", borderRadius: "99px", background: `${tcolor}22`, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: "99px", background: tcolor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {classifiedTotal > 0 && unclassifiedTotal > 0.001 && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                  <span>Sin clasificar</span>
                  <span>${unclassifiedTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* By member */}
          {sortedMembers.length > 0 && (
            <div style={{ borderTop: "1px solid #E2E8F0", padding: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                Por miembro
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                {sortedMembers.map(([memberId, { name, total }]) => {
                  const pct = grandTotalUsd > 0 ? (total / grandTotalUsd) * 100 : 0;
                  return (
                    <div key={memberId} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{
                          fontSize: "12px", padding: "1px 8px", borderRadius: "99px",
                          background: "#DBEAFE", color: "#1D4ED8", fontWeight: 600,
                        }}>
                          {name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{pct.toFixed(1)}%</span>
                      </div>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "#DC2626" }}>${total.toFixed(2)}</p>
                      <div style={{ height: "3px", borderRadius: "99px", background: "#BFDBFE", marginTop: "8px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: "99px", background: "#2563EB" }} />
                      </div>
                    </div>
                  );
                })}
                {unassignedTotal > 0.001 && (
                  <div style={{ background: "#F8FAFC", borderRadius: "8px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#94A3B8", fontStyle: "italic" }}>Sin asignar</span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                        {grandTotalUsd > 0 ? ((unassignedTotal / grandTotalUsd) * 100).toFixed(1) : "0"}%
                      </span>
                    </div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#94A3B8" }}>${unassignedTotal.toFixed(2)}</p>
                    <div style={{ height: "3px", borderRadius: "99px", background: "#E2E8F0", marginTop: "8px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${grandTotalUsd > 0 ? (unassignedTotal / grandTotalUsd) * 100 : 0}%`, borderRadius: "99px", background: "#CBD5E1" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grand total bar */}
          <div style={{
            borderTop: "2px solid #E2E8F0",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "32px",
            background: "#FAFAFA",
          }}>
            {grandTotalBs > 0 && (
              <span style={{ fontSize: "14px", color: "#64748B" }}>
                Total Bs: <strong>{grandTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs</strong>
              </span>
            )}
            <span style={{ fontSize: "16px", color: "#DC2626" }}>
              Total USD: <strong>${grandTotalUsd.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
