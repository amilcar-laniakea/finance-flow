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

  const distsByIncome = new Map<string, { memberId: string | null; fullName: string | null; amountUsd: string }[]>();
  for (const d of allDists) {
    if (!distsByIncome.has(d.incomeId)) distsByIncome.set(d.incomeId, []);
    distsByIncome.get(d.incomeId)!.push({ memberId: d.memberId, fullName: d.fullName, amountUsd: d.amountUsd });
  }

  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ingresos</h1>
        <AddIncomeModal sources={sources} members={members} />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-muted-foreground text-center">
            Aún no hay ingresos registrados.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-muted/50">
                <th className="text-left px-4 py-3">Fuente</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-right px-4 py-3">USD</th>
                <th className="text-right px-4 py-3">Bs</th>
                <th className="text-right px-4 py-3">Fecha</th>
                <th className="text-center px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const src = i.sourceId ? sourceMap[i.sourceId] : null;
                const label = src?.name ?? i.source ?? i.description ?? i.id;
                const dists = distsByIncome.get(i.id) ?? [];
                return (
                  <React.Fragment key={i.id}>
                    <tr className={dists.length > 0 ? "" : "border-b border-border/60"}>
                      <td className="px-4 py-3">
                        {src ? (
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full shrink-0 inline-block" style={{ background: src.color ?? "#16A34A" }} />
                            <span className="font-medium text-green-600 dark:text-green-400">{src.name}</span>
                          </span>
                        ) : (
                          <span className="font-medium text-green-600 dark:text-green-400">{i.source ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{i.description ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        ${i.amountUsd}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {i.amountBs ? `${i.amountBs} Bs` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {i.occurredAt ? new Date(i.occurredAt).toLocaleDateString("es-VE") : "—"}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
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

                    {dists.length > 0 && (
                      <tr className="border-b border-border/60">
                        <td colSpan={6} className="px-4 pb-2.5 pl-6">
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span className="text-[11px] text-muted-foreground mr-0.5">Distribución:</span>
                            {dists.map((d, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  d.memberId
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
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
