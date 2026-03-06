import React from "react";
import { db, incomes, incomeSources, users, incomeDistributions } from "@repo/db";
import { isNull, desc, eq, inArray } from "drizzle-orm";
import { AddIncomeModal } from "./_components/AddIncomeModal";
import { EditIncomeModal } from "./_components/EditIncomeModal";
import { DeleteIncomeButton } from "./_components/DeleteIncomeButton";

export default async function IncomesPage() {
  const [rows, sources, members] = await Promise.all([
    db
      .select()
      .from(incomes)
      .where(isNull(incomes.deletedAt))
      .orderBy(desc(incomes.occurredAt))
      .limit(100),
    db
      .select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources)
      .where(eq(incomeSources.isActive, true))
      .orderBy(incomeSources.name),
    db
      .select({ id: users.id, nickname: users.fullName })
      .from(users)
      .orderBy(users.fullName),
  ]);

  // Fetch all distributions for visible incomes in one query
  const incomeIds = rows.map((r) => r.id);
  const allDists = incomeIds.length > 0
    ? await db
        .select({
          incomeId: incomeDistributions.incomeId,
          memberId: incomeDistributions.memberId,
          amountUsd: incomeDistributions.amountUsd,
          fullName: users.fullName,
        })
        .from(incomeDistributions)
        .leftJoin(users, eq(incomeDistributions.memberId, users.id))
        .where(inArray(incomeDistributions.incomeId, incomeIds))
    : [];

  // Group distributions by incomeId
  const distsByIncome = new Map<string, { memberId: string | null; fullName: string | null; amountUsd: string }[]>();
  for (const d of allDists) {
    if (!distsByIncome.has(d.incomeId)) distsByIncome.set(d.incomeId, []);
    distsByIncome.get(d.incomeId)!.push({
      memberId: d.memberId,
      fullName: d.fullName,
      amountUsd: d.amountUsd,
    });
  }

  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Ingresos</h1>
        <AddIncomeModal sources={sources} members={members} />
      </div>

      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
        {rows.length === 0 ? (
          <p style={{ padding: "32px", color: "#94A3B8", textAlign: "center" }}>
            Aún no hay ingresos registrados.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", background: "#F8FAFC" }}>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Fuente</th>
                <th style={{ textAlign: "left", padding: "12px 16px" }}>Descripción</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>USD</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>Bs</th>
                <th style={{ textAlign: "right", padding: "12px 16px" }}>Fecha</th>
                <th style={{ textAlign: "center", padding: "12px 16px", width: "80px" }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const src = i.sourceId ? sourceMap[i.sourceId] : null;
                const label = src?.name ?? i.source ?? i.description ?? i.id;
                const dists = distsByIncome.get(i.id) ?? [];
                return (
                  <React.Fragment key={i.id}>
                    <tr style={{ borderBottom: dists.length > 0 ? "none" : "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        {src ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: src.color ?? "#16A34A", flexShrink: 0, display: "inline-block" }} />
                            <span style={{ fontWeight: 500, color: "#16A34A" }}>{src.name}</span>
                          </span>
                        ) : (
                          <span style={{ fontWeight: 500, color: "#16A34A" }}>{i.source ?? "—"}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>{i.description ?? "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#16A34A", fontWeight: 700 }}>
                        ${i.amountUsd}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#94A3B8" }}>
                        {i.amountBs ? `${i.amountBs} Bs` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748B" }}>
                        {i.occurredAt ? new Date(i.occurredAt).toLocaleDateString("es-VE") : "—"}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                          <EditIncomeModal
                            income={{
                              id: i.id,
                              source: i.source,
                              sourceId: i.sourceId,
                              description: i.description,
                              memberId: i.memberId,
                              amountUsd: i.amountUsd,
                              amountBs: i.amountBs,
                              exchangeRate: i.exchangeRate,
                              period: i.period,
                            }}
                            sources={sources}
                            members={members}
                          />
                          <DeleteIncomeButton id={i.id} label={label} />
                        </div>
                      </td>
                    </tr>

                    {/* Distribution breakdown sub-row */}
                    {dists.length > 0 && (
                      <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td colSpan={6} style={{ padding: "0 16px 10px 24px" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "#94A3B8", marginRight: "2px" }}>
                              Distribución:
                            </span>
                            {dists.map((d, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "12px",
                                  padding: "2px 8px",
                                  borderRadius: "99px",
                                  background: d.memberId ? "#EFF6FF" : "#F1F5F9",
                                  color: d.memberId ? "#2563EB" : "#64748B",
                                  fontWeight: 500,
                                }}
                              >
                                {d.fullName ?? "Fondo hogar"} · ${parseFloat(d.amountUsd).toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
