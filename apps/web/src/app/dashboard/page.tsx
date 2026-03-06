import { auth } from "@clerk/nextjs/server";
import {
  db, expenses, incomes, users, incomeSources,
  incomeDistributions, expenseSourceSplits, fundTransfers, expenseTypeAmounts, expenseTypes,
} from "@repo/db";
import { isNull, and, gte, lte, sql, desc, eq } from "drizzle-orm";

function currentPeriod() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    label: now.toLocaleString("es-VE", { month: "long", year: "numeric" }),
  };
}

function prevPeriod() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const period = currentPeriod();
  const prev = prevPeriod();

  // ── Parallel batch 1 ────────────────────────────────────────────
  const [
    expenseSum, incomeSum,
    prevExpenseSum, prevIncomeSum,
    memberExpenseRows, memberIncomeRows,
    expenseTypeRows,
    recentExpenses, recentIncomes,
    allSources, allUsers,
    expenseCount, maxExpense,
  ] = await Promise.all([
    // This month totals
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end))),
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(incomes)
      .where(and(isNull(incomes.deletedAt), gte(incomes.occurredAt, period.start), lte(incomes.occurredAt, period.end))),
    // Previous month totals (for trend)
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, prev.start), lte(expenses.occurredAt, prev.end))),
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(incomes)
      .where(and(isNull(incomes.deletedAt), gte(incomes.occurredAt, prev.start), lte(incomes.occurredAt, prev.end))),
    // Expenses per member (this month)
    db.select({ memberId: expenses.memberId, total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
      .from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end)))
      .groupBy(expenses.memberId),
    // Distributions per member (this month)
    db.select({ memberId: incomeDistributions.memberId, total: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}), 0)` })
      .from(incomeDistributions)
      .innerJoin(incomes, eq(incomeDistributions.incomeId, incomes.id))
      .where(and(gte(incomes.period, period.start), lte(incomes.period, period.end), isNull(incomes.deletedAt)))
      .groupBy(incomeDistributions.memberId),
    // Expense types (this month) — join catalog for name + color
    db.select({
        typeName: expenseTypes.name,
        typeColor: expenseTypes.color,
        total: sql<string>`SUM(${expenseTypeAmounts.amount})`,
      })
      .from(expenseTypeAmounts)
      .innerJoin(expenses, eq(expenseTypeAmounts.expenseId, expenses.id))
      .innerJoin(expenseTypes, eq(expenseTypeAmounts.expenseTypeId, expenseTypes.id))
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end)))
      .groupBy(expenseTypeAmounts.expenseTypeId, expenseTypes.name, expenseTypes.color),
    // Recent activity
    db.select({ id: expenses.id, description: expenses.description, merchant: expenses.merchant, amountUsd: expenses.amountUsd, occurredAt: expenses.occurredAt, memberId: expenses.memberId })
      .from(expenses).where(isNull(expenses.deletedAt)).orderBy(desc(expenses.occurredAt)).limit(6),
    db.select({ id: incomes.id, description: incomes.description, amountUsd: incomes.amountUsd, occurredAt: incomes.occurredAt })
      .from(incomes).where(isNull(incomes.deletedAt)).orderBy(desc(incomes.occurredAt)).limit(6),
    // Sources & users for name lookups
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color }).from(incomeSources).where(eq(incomeSources.isActive, true)),
    db.select({ id: users.id, name: users.fullName }).from(users).orderBy(users.fullName),
    // Expense count this month
    db.select({ count: sql<string>`COUNT(*)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end))),
    // Largest single expense this month
    db.select({ amount: expenses.amountUsd, description: expenses.description })
      .from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end)))
      .orderBy(desc(expenses.amountUsd)).limit(1),
  ]);

  // ── Fund balances (including transfers) ─────────────────────────
  const fundBalances = await Promise.all(
    allSources.map(async (s) => {
      const [inc] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomes).where(and(eq(incomes.sourceId, s.id), isNull(incomes.deletedAt)));
      const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)));
      const [spl] = await db.select({ t: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}),0)` }).from(expenseSourceSplits).innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id)).where(and(eq(expenseSourceSplits.incomeSourceId, s.id), isNull(expenses.deletedAt)));
      const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toSourceId, s.id), isNull(fundTransfers.deletedAt)));
      const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromSourceId, s.id), isNull(fundTransfers.deletedAt)));
      const balance = parseFloat(inc?.t ?? "0") - parseFloat(exp?.t ?? "0") - parseFloat(spl?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
      return { ...s, balance };
    })
  );

  // ── Member balances (all-time, including transfers) ─────────────
  const memberBalanceRows = await Promise.all(
    allUsers.map(async (u) => {
      const [dist] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(incomeDistributions).where(eq(incomeDistributions.memberId, u.id));
      const [exp] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(expenses).where(and(eq(expenses.memberId, u.id), isNull(expenses.deletedAt)));
      const [tin] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.toMemberId, u.id), isNull(fundTransfers.deletedAt)));
      const [tout] = await db.select({ t: sql<string>`COALESCE(SUM(amount_usd),0)` }).from(fundTransfers).where(and(eq(fundTransfers.fromMemberId, u.id), isNull(fundTransfers.deletedAt)));
      const balance = parseFloat(dist?.t ?? "0") - parseFloat(exp?.t ?? "0") + parseFloat(tin?.t ?? "0") - parseFloat(tout?.t ?? "0");
      return { id: u.id, balance };
    })
  );
  const memberBalanceMap = Object.fromEntries(memberBalanceRows.map((m) => [m.id, m.balance]));

  // ── Derived values ───────────────────────────────────────────────
  const totalIncome = parseFloat(incomeSum[0]?.total ?? "0");
  const totalExpenses = parseFloat(expenseSum[0]?.total ?? "0");
  const netBalance = totalIncome - totalExpenses;
  const prevIncome = parseFloat(prevIncomeSum[0]?.total ?? "0");
  const prevExpenses = parseFloat(prevExpenseSum[0]?.total ?? "0");
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
  const totalFundsBalance = fundBalances.reduce((s, f) => s + f.balance, 0);
  const expenseCountNum = parseInt(expenseCount[0]?.count ?? "0");
  const avgExpense = expenseCountNum > 0 ? totalExpenses / expenseCountNum : 0;
  const activeMembers = allUsers.length;

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name ?? "—"]));

  // Merge & sort recent activity
  const activity = [
    ...recentExpenses.map((e) => ({ type: "expense" as const, id: e.id, description: e.description, sub: e.merchant ?? (e.memberId ? userMap[e.memberId] : null), amount: parseFloat(e.amountUsd), date: e.occurredAt })),
    ...recentIncomes.map((i) => ({ type: "income" as const, id: i.id, description: i.description ?? "Ingreso", sub: null, amount: parseFloat(i.amountUsd), date: i.occurredAt })),
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, 10);

  // Member stats
  const expByMember = Object.fromEntries(memberExpenseRows.map((r) => [r.memberId ?? "__none__", parseFloat(r.total)]));
  const incByMember = Object.fromEntries(memberIncomeRows.map((r) => [r.memberId ?? "__none__", parseFloat(r.total)]));
  const maxMemberExp = Math.max(0, ...Object.values(expByMember));
  const maxMemberInc = Math.max(0, ...Object.values(incByMember));

  // Type totals sorted
  const sortedTypes = [...expenseTypeRows].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  const maxTypeTotal = sortedTypes.length > 0 ? parseFloat(sortedTypes[0]!.total) : 0;

  // Trend helpers
  function trend(current: number, previous: number) {
    if (previous === 0) return null;
    const pct = ((current - previous) / previous) * 100;
    return pct;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Resumen</h1>
        <p style={{ color: "#64748B", marginTop: "4px", fontSize: "14px", textTransform: "capitalize" }}>{period.label}</p>
      </div>

      {/* ── Row 1: KPI cards ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
        <KpiCard
          label="Ingresos"
          value={`$${totalIncome.toFixed(2)}`}
          color="#16A34A"
          bg="#F0FDF4"
          trend={trend(totalIncome, prevIncome)}
          sub={`${prevIncome > 0 ? "vs mes anterior" : "primer mes"}`}
        />
        <KpiCard
          label="Gastos"
          value={`$${totalExpenses.toFixed(2)}`}
          color="#DC2626"
          bg="#FEF2F2"
          trend={trend(totalExpenses, prevExpenses)}
          trendInvert
          sub={`${expenseCountNum} transacción${expenseCountNum !== 1 ? "es" : ""}`}
        />
        <KpiCard
          label="Balance neto"
          value={`${netBalance >= 0 ? "+" : ""}$${netBalance.toFixed(2)}`}
          color={netBalance >= 0 ? "#2563EB" : "#D97706"}
          bg={netBalance >= 0 ? "#EFF6FF" : "#FFFBEB"}
          sub={`promedio $${avgExpense.toFixed(2)}/gasto`}
        />
        <KpiCard
          label="Saldo en fondos"
          value={`$${totalFundsBalance.toFixed(2)}`}
          color={totalFundsBalance >= 0 ? "#7C3AED" : "#DC2626"}
          bg="#F5F3FF"
          sub={`${allSources.length} fondo${allSources.length !== 1 ? "s" : ""} activo${allSources.length !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Miembros"
          value={String(activeMembers)}
          color="#0EA5E9"
          bg="#F0F9FF"
          sub="usuarios registrados"
        />
      </div>

      {/* ── Savings rate bar ─────────────────────────────────────── */}
      {totalIncome > 0 && (
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Tasa de ahorro</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: savingsRate >= 20 ? "#16A34A" : savingsRate >= 10 ? "#D97706" : "#DC2626" }}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
          <div style={{ height: "8px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, savingsRate)}%`, borderRadius: "99px", background: savingsRate >= 20 ? "#16A34A" : savingsRate >= 10 ? "#F59E0B" : "#DC2626", transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#94A3B8" }}>
            <span>Gastado: ${totalExpenses.toFixed(2)}</span>
            <span>Ahorro: ${Math.max(0, netBalance).toFixed(2)}</span>
            <span>Total ingresado: ${totalIncome.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── Row 2: Member breakdown + Fund balances ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Gastos por miembro */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
            Gastos por miembro — {period.label}
          </p>
          {allUsers.length === 0 || Object.keys(expByMember).length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin datos este mes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {allUsers.map((u) => {
                const amt = expByMember[u.id] ?? 0;
                const pct = maxMemberExp > 0 ? (amt / maxMemberExp) * 100 : 0;
                const avail = memberBalanceMap[u.id] ?? 0;
                return (
                  <div key={u.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{u.name ?? "—"}</span>
                        <span style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: avail >= 0 ? "#1D4ED8" : "#DC2626",
                          marginTop: "1px",
                        }}>
                          Disponible: {avail >= 0 ? "+" : ""}${avail.toFixed(2)}
                        </span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: amt > 0 ? "#DC2626" : "#CBD5E1" }}>
                        {amt > 0 ? `$${amt.toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#DC2626", borderRadius: "99px", opacity: amt > 0 ? 1 : 0 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ingresos distribuidos por miembro */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
            Ingresos por miembro — {period.label}
          </p>
          {allUsers.length === 0 || Object.keys(incByMember).length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin distribuciones este mes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {allUsers.map((u) => {
                const amt = incByMember[u.id] ?? 0;
                const pct = maxMemberInc > 0 ? (amt / maxMemberInc) * 100 : 0;
                return (
                  <div key={u.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{u.name ?? "—"}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: amt > 0 ? "#16A34A" : "#CBD5E1" }}>
                        {amt > 0 ? `+$${amt.toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#16A34A", borderRadius: "99px", opacity: amt > 0 ? 1 : 0 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saldo por fondo */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
            Saldo por fondo
          </p>
          {fundBalances.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin fondos</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...fundBalances].sort((a, b) => b.balance - a.balance).map((f) => {
                const maxBal = Math.max(...fundBalances.map((x) => Math.abs(x.balance)), 1);
                const pct = (Math.abs(f.balance) / maxBal) * 100;
                return (
                  <div key={f.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500 }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: f.color ?? "#16A34A", display: "inline-block" }} />
                        {f.name}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: f.balance >= 0 ? "#7C3AED" : "#DC2626" }}>
                        ${f.balance.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ height: "5px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: f.balance >= 0 ? (f.color ?? "#7C3AED") : "#DC2626", borderRadius: "99px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gastos por tipo */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
            Gastos por tipo — {period.label}
          </p>
          {sortedTypes.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin clasificación este mes</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {sortedTypes.map((t) => {
                const amt = parseFloat(t.total);
                const pct = maxTypeTotal > 0 ? (amt / maxTypeTotal) * 100 : 0;
                const tcolor = t.typeColor ?? "#7C3AED";
                return (
                  <div key={t.typeName}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", padding: "1px 7px", borderRadius: "99px", background: `${tcolor}22`, color: tcolor, fontWeight: 600 }}>
                        {t.typeName}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>${amt.toFixed(2)}</span>
                    </div>
                    <div style={{ height: "5px", background: "#F1F5F9", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: tcolor, borderRadius: "99px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Largest expense + Activity feed ───────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px" }}>

        {/* Stats mini-cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "16px 20px" }}>
            <p style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Mayor gasto del mes</p>
            {maxExpense.length > 0 ? (
              <>
                <p style={{ fontSize: "20px", fontWeight: 700, color: "#DC2626" }}>${parseFloat(maxExpense[0]!.amount).toFixed(2)}</p>
                <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>{maxExpense[0]!.description}</p>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "#CBD5E1" }}>—</p>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "16px 20px" }}>
            <p style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Gasto promedio</p>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "#374151" }}>{expenseCountNum > 0 ? `$${avgExpense.toFixed(2)}` : "—"}</p>
            <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>{expenseCountNum} transacciones</p>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "16px 20px" }}>
            <p style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>vs mes anterior</p>
            {prevExpenses > 0 ? (
              <>
                <p style={{ fontSize: "20px", fontWeight: 700, color: totalExpenses > prevExpenses ? "#DC2626" : "#16A34A" }}>
                  {totalExpenses > prevExpenses ? "▲" : "▼"} {Math.abs(((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1)}%
                </p>
                <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>gastos ${prevExpenses.toFixed(2)} anterior</p>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "#CBD5E1" }}>Sin datos previos</p>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px" }}>
            Actividad reciente
          </p>
          {activity.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#CBD5E1", textAlign: "center", padding: "24px 0" }}>Sin actividad registrada</p>
          ) : (
            <div>
              {activity.map((item, i) => (
                <div
                  key={item.id + item.type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom: i < activity.length - 1 ? "1px solid #F1F5F9" : "none",
                  }}
                >
                  {/* Icon dot */}
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: item.type === "expense" ? "#FEF2F2" : "#F0FDF4",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px",
                  }}>
                    {item.type === "expense" ? "↑" : "↓"}
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.description}
                    </p>
                    {item.sub && (
                      <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "1px" }}>{item.sub}</p>
                    )}
                  </div>
                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: item.type === "expense" ? "#DC2626" : "#16A34A" }}>
                      {item.type === "expense" ? "-" : "+"}${item.amount.toFixed(2)}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94A3B8", marginTop: "1px" }}>
                      {item.date ? new Date(item.date).toLocaleDateString("es-VE") : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────

function KpiCard({
  label, value, color, bg, trend, trendInvert, sub,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  trend?: number | null;
  trendInvert?: boolean;
  sub?: string;
}) {
  const trendGood = trendInvert ? (trend ?? 0) <= 0 : (trend ?? 0) >= 0;
  return (
    <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", padding: "18px 20px" }}>
      <p style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>{label}</p>
      <p style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
        {sub && <span style={{ fontSize: "11px", color: "#94A3B8" }}>{sub}</span>}
        {trend != null && (
          <span style={{ fontSize: "11px", fontWeight: 600, color: trendGood ? "#16A34A" : "#DC2626", background: bg, padding: "1px 6px", borderRadius: "99px" }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
