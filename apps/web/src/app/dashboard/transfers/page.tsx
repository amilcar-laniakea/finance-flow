import { db, fundTransfers, incomeSources, users, incomes, expenses, expenseSourceSplits, incomeDistributions } from "@repo/db";
import { eq, isNull, sql, and, desc } from "drizzle-orm";
import { AddTransferModal } from "./_components/AddTransferModal";
import { DeleteTransferButton } from "./_components/DeleteTransferButton";

async function getFundBalance(sourceId: string) {
  const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, sourceId), isNull(incomes.deletedAt)));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, sourceId), isNull(expenses.deletedAt)));
  const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, sourceId), isNull(expenses.deletedAt)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, sourceId), isNull(fundTransfers.deletedAt)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, sourceId), isNull(fundTransfers.deletedAt)));
  return parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

async function getMemberBalance(memberId: string) {
  const [dist] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomeDistributions).where(eq(incomeDistributions.memberId, memberId));
  const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.memberId, memberId), isNull(expenses.deletedAt)));
  const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toMemberId, memberId), isNull(fundTransfers.deletedAt)));
  const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromMemberId, memberId), isNull(fundTransfers.deletedAt)));
  return parseFloat(dist?.t ?? "0") - parseFloat(exp?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
}

export default async function TransfersPage() {
  const [rawSources, rawUsers] = await Promise.all([
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color })
      .from(incomeSources).where(eq(incomeSources.isActive, true)).orderBy(incomeSources.name),
    db.select({ id: users.id, name: users.fullName }).from(users).orderBy(users.fullName),
  ]);

  const sources = await Promise.all(rawSources.map(async (s) => ({ ...s, balance: await getFundBalance(s.id) })));
  const members = await Promise.all(rawUsers.map(async (u) => ({ id: u.id, name: u.name ?? u.id.slice(0, 8), balance: await getMemberBalance(u.id) })));

  const rows = await db
    .select({
      id: fundTransfers.id,
      transferType: fundTransfers.transferType,
      fromSourceId: fundTransfers.fromSourceId,
      toSourceId: fundTransfers.toSourceId,
      fromMemberId: fundTransfers.fromMemberId,
      toMemberId: fundTransfers.toMemberId,
      amountUsd: fundTransfers.amountUsd,
      description: fundTransfers.description,
      period: fundTransfers.period,
    })
    .from(fundTransfers)
    .where(isNull(fundTransfers.deletedAt))
    .orderBy(desc(fundTransfers.period));

  const srcMap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const usrMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const fundRows = rows.filter((r) => r.transferType === "fund");
  const memberRows = rows.filter((r) => r.transferType === "member");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transferencias</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {rows.length} transferencia{rows.length !== 1 ? "s" : ""} registrada{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTransferModal sources={sources} members={members} />
      </div>

      {/* Balance summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3.5">
            Saldo actual por fondo
          </p>
          {sources.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">Sin fondos</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-1.5 text-[13px] text-foreground">
                  <span className="size-2 rounded-full shrink-0 inline-block" style={{ background: s.color ?? "#16A34A" }} />
                  {s.name}
                </span>
                <span className={`font-bold text-[13px] ${s.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                  ${s.balance.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3.5">
            Saldo actual por miembro
          </p>
          {members.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">Sin miembros</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-foreground">{m.name}</span>
                <span className={`font-bold text-[13px] ${m.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                  ${m.balance.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transfer history */}
      {[
        { label: "Transferencias entre fondos", list: fundRows, type: "fund" as const },
        { label: "Transferencias entre miembros", list: memberRows, type: "member" as const },
      ].map(({ label, list, type }) => (
        <div key={type} className="mb-7">
          <h2 className="text-[13px] font-bold text-foreground uppercase tracking-wide mb-3">
            {label} ({list.length})
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {list.length === 0 ? (
              <p className="p-6 text-muted-foreground/60 text-center text-[13px]">
                Sin transferencias aún
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/50">
                    <th className="text-left px-4 py-2.5">Origen</th>
                    <th className="text-left px-1 py-2.5" />
                    <th className="text-left px-4 py-2.5">Destino</th>
                    <th className="text-left px-4 py-2.5">Descripción</th>
                    <th className="text-right px-4 py-2.5">Monto</th>
                    <th className="text-right px-4 py-2.5">Fecha</th>
                    <th className="px-2 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const from = type === "fund"
                      ? (r.fromSourceId ? srcMap[r.fromSourceId] : null)
                      : (r.fromMemberId ? usrMap[r.fromMemberId] : null);
                    const to = type === "fund"
                      ? (r.toSourceId ? srcMap[r.toSourceId] : null)
                      : (r.toMemberId ? usrMap[r.toMemberId] : null);
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            type === "fund"
                              ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                          }`}>
                            {from?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-muted-foreground text-base">→</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                            {to?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          ${parseFloat(r.amountUsd).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <DeleteTransferButton id={r.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
