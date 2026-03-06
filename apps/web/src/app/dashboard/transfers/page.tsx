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

  // Compute live balances for the modal
  const sources = await Promise.all(rawSources.map(async (s) => ({ ...s, balance: await getFundBalance(s.id) })));
  const members = await Promise.all(rawUsers.map(async (u) => ({ id: u.id, name: u.name ?? u.id.slice(0, 8), balance: await getMemberBalance(u.id) })));

  // Fetch all transfers with resolved names
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Transferencias</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {rows.length} transferencia{rows.length !== 1 ? "s" : ""} registrada{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTransferModal sources={sources} members={members} />
      </div>

      {/* Balance summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        {/* Funds */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
            Saldo actual por fondo
          </p>
          {sources.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin fondos</p>
          ) : (
            sources.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color ?? "#16A34A", display: "inline-block", flexShrink: 0 }} />
                  {s.name}
                </span>
                <span style={{ fontWeight: 700, color: s.balance >= 0 ? "#1D4ED8" : "#DC2626", fontSize: "13px" }}>
                  ${s.balance.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
        {/* Members */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
            Saldo actual por miembro
          </p>
          {members.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin miembros</p>
          ) : (
            members.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px" }}>{m.name}</span>
                <span style={{ fontWeight: 700, color: m.balance >= 0 ? "#1D4ED8" : "#DC2626", fontSize: "13px" }}>
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
        <div key={type} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            {label} ({list.length})
          </h2>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
            {list.length === 0 ? (
              <p style={{ padding: "24px", color: "#CBD5E1", textAlign: "center", fontSize: "13px" }}>
                Sin transferencias aún
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", background: "#F8FAFC" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px" }}>Origen</th>
                    <th style={{ textAlign: "left", padding: "10px 16px" }}></th>
                    <th style={{ textAlign: "left", padding: "10px 16px" }}>Destino</th>
                    <th style={{ textAlign: "left", padding: "10px 16px" }}>Descripción</th>
                    <th style={{ textAlign: "right", padding: "10px 16px" }}>Monto</th>
                    <th style={{ textAlign: "right", padding: "10px 16px" }}>Fecha</th>
                    <th style={{ padding: "10px 8px", width: "48px" }} />
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
                      <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontSize: "12px", padding: "2px 8px", borderRadius: "99px",
                            background: type === "fund" ? "#FEF2F2" : "#EFF6FF",
                            color: type === "fund" ? "#DC2626" : "#2563EB",
                            fontWeight: 600,
                          }}>
                            {from?.name ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 4px", color: "#94A3B8", fontSize: "16px" }}>→</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontSize: "12px", padding: "2px 8px", borderRadius: "99px",
                            background: type === "fund" ? "#F0FDF4" : "#F0FDF4",
                            color: type === "fund" ? "#16A34A" : "#16A34A",
                            fontWeight: 600,
                          }}>
                            {to?.name ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748B" }}>{r.description ?? "—"}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#2563EB" }}>
                          ${parseFloat(r.amountUsd).toFixed(2)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748B" }}>
                          {r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
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
