import { auth } from "@clerk/nextjs/server";
import {
  db, expenses, incomes, users, incomeSources,
  incomeDistributions, expenseSourceSplits, fundTransfers, expenseTypeAmounts, expenseTypes,
} from "@repo/db";
import { isNull, and, gte, lte, sql, desc, eq } from "drizzle-orm";
import {
  Card, CardContent, CardHeader, CardTitle,
  Progress,
} from "@repo/ui";

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
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end))),
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(incomes)
      .where(and(isNull(incomes.deletedAt), gte(incomes.occurredAt, period.start), lte(incomes.occurredAt, period.end))),
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, prev.start), lte(expenses.occurredAt, prev.end))),
    db.select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` }).from(incomes)
      .where(and(isNull(incomes.deletedAt), gte(incomes.occurredAt, prev.start), lte(incomes.occurredAt, prev.end))),
    db.select({ memberId: expenses.memberId, total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
      .from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end)))
      .groupBy(expenses.memberId),
    db.select({ memberId: incomeDistributions.memberId, total: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}), 0)` })
      .from(incomeDistributions)
      .innerJoin(incomes, eq(incomeDistributions.incomeId, incomes.id))
      .where(and(gte(incomes.period, period.start), lte(incomes.period, period.end), isNull(incomes.deletedAt)))
      .groupBy(incomeDistributions.memberId),
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
    db.select({ id: expenses.id, description: expenses.description, merchant: expenses.merchant, amountUsd: expenses.amountUsd, occurredAt: expenses.occurredAt, memberId: expenses.memberId })
      .from(expenses).where(isNull(expenses.deletedAt)).orderBy(desc(expenses.occurredAt)).limit(6),
    db.select({ id: incomes.id, description: incomes.description, amountUsd: incomes.amountUsd, occurredAt: incomes.occurredAt })
      .from(incomes).where(isNull(incomes.deletedAt)).orderBy(desc(incomes.occurredAt)).limit(6),
    db.select({ id: incomeSources.id, name: incomeSources.name, color: incomeSources.color }).from(incomeSources).where(eq(incomeSources.isActive, true)),
    db.select({ id: users.id, name: users.fullName }).from(users).orderBy(users.fullName),
    db.select({ count: sql<string>`COUNT(*)` }).from(expenses)
      .where(and(isNull(expenses.deletedAt), gte(expenses.occurredAt, period.start), lte(expenses.occurredAt, period.end))),
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

  const activity = [
    ...recentExpenses.map((e) => ({ type: "expense" as const, id: e.id, description: e.description, sub: e.merchant ?? (e.memberId ? userMap[e.memberId] : null), amount: parseFloat(e.amountUsd), date: e.occurredAt })),
    ...recentIncomes.map((i) => ({ type: "income" as const, id: i.id, description: i.description ?? "Ingreso", sub: null, amount: parseFloat(i.amountUsd), date: i.occurredAt })),
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, 10);

  const expByMember = Object.fromEntries(memberExpenseRows.map((r) => [r.memberId ?? "__none__", parseFloat(r.total)]));
  const incByMember = Object.fromEntries(memberIncomeRows.map((r) => [r.memberId ?? "__none__", parseFloat(r.total)]));
  const maxMemberExp = Math.max(0, ...Object.values(expByMember));
  const maxMemberInc = Math.max(0, ...Object.values(incByMember));

  const sortedTypes = [...expenseTypeRows].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  const maxTypeTotal = sortedTypes.length > 0 ? parseFloat(sortedTypes[0]!.total) : 0;

  function trend(current: number, previous: number) {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{period.label}</p>
      </div>

      {/* ── Row 1: KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Ingresos"
          value={`$${totalIncome.toFixed(2)}`}
          colorClass="text-green-600"
          trend={trend(totalIncome, prevIncome)}
          sub={`${prevIncome > 0 ? "vs mes anterior" : "primer mes"}`}
        />
        <KpiCard
          label="Gastos"
          value={`$${totalExpenses.toFixed(2)}`}
          colorClass="text-red-600"
          trend={trend(totalExpenses, prevExpenses)}
          trendInvert
          sub={`${expenseCountNum} transacción${expenseCountNum !== 1 ? "es" : ""}`}
        />
        <KpiCard
          label="Balance neto"
          value={`${netBalance >= 0 ? "+" : ""}$${netBalance.toFixed(2)}`}
          colorClass={netBalance >= 0 ? "text-blue-600" : "text-amber-600"}
          sub={`promedio $${avgExpense.toFixed(2)}/gasto`}
        />
        <KpiCard
          label="Saldo en fondos"
          value={`$${totalFundsBalance.toFixed(2)}`}
          colorClass={totalFundsBalance >= 0 ? "text-violet-600" : "text-red-600"}
          sub={`${allSources.length} fondo${allSources.length !== 1 ? "s" : ""} activo${allSources.length !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Miembros"
          value={String(activeMembers)}
          colorClass="text-sky-500"
          sub="usuarios registrados"
        />
      </div>

      {/* ── Savings rate bar ─────────────────────────────────────── */}
      {totalIncome > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Tasa de ahorro</span>
              <span className={`text-sm font-bold ${savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-amber-600" : "text-red-600"}`}>
                {savingsRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(100, savingsRate)} className="h-2" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Gastado: ${totalExpenses.toFixed(2)}</span>
              <span>Ahorro: ${Math.max(0, netBalance).toFixed(2)}</span>
              <span>Total ingresado: ${totalIncome.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Row 2: Member breakdown + Fund balances ──────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Gastos por miembro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gastos por miembro — {period.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 || Object.keys(expByMember).length === 0 ? (
              <p className="text-sm text-muted-foreground/50">Sin datos este mes</p>
            ) : (
              <div className="flex flex-col gap-3">
                {allUsers.map((u) => {
                  const amt = expByMember[u.id] ?? 0;
                  const pct = maxMemberExp > 0 ? (amt / maxMemberExp) * 100 : 0;
                  const avail = memberBalanceMap[u.id] ?? 0;
                  return (
                    <div key={u.id}>
                      <div className="mb-1 flex items-start justify-between">
                        <div>
                          <span className="text-sm font-medium text-foreground">{u.name ?? "—"}</span>
                          <span className={`block text-xs font-semibold mt-px ${avail >= 0 ? "text-blue-700" : "text-red-600"}`}>
                            Disponible: {avail >= 0 ? "+" : ""}${avail.toFixed(2)}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${amt > 0 ? "text-red-600" : "text-muted-foreground/40"}`}>
                          {amt > 0 ? `$${amt.toFixed(2)}` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%`, opacity: amt > 0 ? 1 : 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ingresos distribuidos por miembro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ingresos por miembro — {period.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 || Object.keys(incByMember).length === 0 ? (
              <p className="text-sm text-muted-foreground/50">Sin distribuciones este mes</p>
            ) : (
              <div className="flex flex-col gap-3">
                {allUsers.map((u) => {
                  const amt = incByMember[u.id] ?? 0;
                  const pct = maxMemberInc > 0 ? (amt / maxMemberInc) * 100 : 0;
                  return (
                    <div key={u.id}>
                      <div className="mb-1 flex justify-between">
                        <span className="text-sm font-medium text-foreground">{u.name ?? "—"}</span>
                        <span className={`text-sm font-bold ${amt > 0 ? "text-green-600" : "text-muted-foreground/40"}`}>
                          {amt > 0 ? `+$${amt.toFixed(2)}` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%`, opacity: amt > 0 ? 1 : 0 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldo por fondo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Saldo por fondo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fundBalances.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">Sin fondos</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {[...fundBalances].sort((a, b) => b.balance - a.balance).map((f) => {
                  const maxBal = Math.max(...fundBalances.map((x) => Math.abs(x.balance)), 1);
                  const pct = (Math.abs(f.balance) / maxBal) * 100;
                  return (
                    <div key={f.id}>
                      <div className="mb-1 flex justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="inline-block size-2 rounded-full" style={{ background: f.color ?? "#16A34A" }} />
                          {f.name}
                        </span>
                        <span className={`text-sm font-bold ${f.balance >= 0 ? "text-violet-600" : "text-red-600"}`}>
                          ${f.balance.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: f.balance >= 0 ? (f.color ?? "#7C3AED") : "#DC2626" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gastos por tipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gastos por tipo — {period.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">Sin clasificación este mes</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sortedTypes.map((t) => {
                  const amt = parseFloat(t.total);
                  const pct = maxTypeTotal > 0 ? (amt / maxTypeTotal) * 100 : 0;
                  const tcolor = t.typeColor ?? "#7C3AED";
                  return (
                    <div key={t.typeName}>
                      <div className="mb-1 flex justify-between">
                        <span className="rounded-full px-2 py-px text-xs font-semibold" style={{ background: `${tcolor}22`, color: tcolor }}>
                          {t.typeName}
                        </span>
                        <span className="text-sm font-bold text-red-600">${amt.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tcolor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Stats mini-cards + Activity feed ───────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">

        {/* Stats mini-cards */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Mayor gasto del mes</p>
              {maxExpense.length > 0 ? (
                <>
                  <p className="text-xl font-bold text-red-600">${parseFloat(maxExpense[0]!.amount).toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{maxExpense[0]!.description}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/40">—</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Gasto promedio</p>
              <p className="text-xl font-bold text-foreground">{expenseCountNum > 0 ? `$${avgExpense.toFixed(2)}` : "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{expenseCountNum} transacciones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">vs mes anterior</p>
              {prevExpenses > 0 ? (
                <>
                  <p className={`text-xl font-bold ${totalExpenses > prevExpenses ? "text-red-600" : "text-green-600"}`}>
                    {totalExpenses > prevExpenses ? "▲" : "▼"} {Math.abs(((totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">gastos ${prevExpenses.toFixed(2)} anterior</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/40">Sin datos previos</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground/50">Sin actividad registrada</p>
            ) : (
              <div>
                {activity.map((item, i) => (
                  <div
                    key={item.id + item.type}
                    className={`flex items-center gap-3 py-2.5 ${i < activity.length - 1 ? "border-b border-muted" : ""}`}
                  >
                    {/* Icon dot */}
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm ${item.type === "expense" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {item.type === "expense" ? "↑" : "↓"}
                    </div>
                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.description}</p>
                      {item.sub && (
                        <p className="mt-px text-xs text-muted-foreground">{item.sub}</p>
                      )}
                    </div>
                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold ${item.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                        {item.type === "expense" ? "-" : "+"}${item.amount.toFixed(2)}
                      </p>
                      <p className="mt-px text-xs text-muted-foreground">
                        {item.date ? new Date(item.date).toLocaleDateString("es-VE") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────

function KpiCard({
  label, value, colorClass, trend, trendInvert, sub,
}: {
  label: string;
  value: string;
  colorClass: string;
  trend?: number | null;
  trendInvert?: boolean;
  sub?: string;
}) {
  const trendGood = trendInvert ? (trend ?? 0) <= 0 : (trend ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        <div className="mt-2 flex items-center justify-between">
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {trend != null && (
            <span className={`rounded-full px-1.5 py-px text-xs font-semibold ${trendGood ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
