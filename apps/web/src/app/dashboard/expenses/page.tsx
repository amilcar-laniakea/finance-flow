import {
  db,
  expenses,
  users,
  incomeSources,
  incomes,
  expenseSourceSplits,
  expenseTypeAmounts,
  expenseTypes,
} from "@repo/db";
import { isNull, desc, eq, and, sql, inArray } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
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
    db
      .select({ id: users.id, nickname: users.fullName })
      .from(users)
      .orderBy(users.fullName),
    db
      .select({
        id: incomeSources.id,
        name: incomeSources.name,
        color: incomeSources.color,
      })
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
        .where(
          and(eq(expenses.incomeSourceId, s.id), isNull(expenses.deletedAt)),
        );
      const [spl] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${expenseSourceSplits.amountUsd}), 0)`,
        })
        .from(expenseSourceSplits)
        .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
        .where(
          and(
            eq(expenseSourceSplits.incomeSourceId, s.id),
            isNull(expenses.deletedAt),
          ),
        );
      const balance =
        parseFloat(inc?.total ?? "0") -
        parseFloat(exp?.total ?? "0") -
        parseFloat(spl?.total ?? "0");
      return { ...s, balance };
    }),
  );

  const expIds = rows.map((r) => r.id);
  const allSplits =
    expIds.length > 0
      ? await db
          .select({
            expenseId: expenseSourceSplits.expenseId,
            incomeSourceId: expenseSourceSplits.incomeSourceId,
            amountUsd: expenseSourceSplits.amountUsd,
          })
          .from(expenseSourceSplits)
          .innerJoin(expenses, eq(expenseSourceSplits.expenseId, expenses.id))
          .where(
            and(
              inArray(expenseSourceSplits.expenseId, expIds),
              isNull(expenses.deletedAt),
            ),
          )
      : [];

  const splitExpenseIds = new Set(allSplits.map((s) => s.expenseId));
  const splitsByExpense = new Map<
    string,
    { incomeSourceId: string; amountUsd: string }[]
  >();
  for (const s of allSplits) {
    if (!splitsByExpense.has(s.expenseId)) splitsByExpense.set(s.expenseId, []);
    splitsByExpense
      .get(s.expenseId)!
      .push({ incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd });
  }

  const allTypeAmounts =
    expIds.length > 0
      ? await db
          .select({
            expenseId: expenseTypeAmounts.expenseId,
            expenseTypeId: expenseTypeAmounts.expenseTypeId,
            amount: expenseTypeAmounts.amount,
          })
          .from(expenseTypeAmounts)
          .where(inArray(expenseTypeAmounts.expenseId, expIds))
      : [];

  const typeAmountsByExpense = new Map<
    string,
    { expenseTypeId: string; amount: string }[]
  >();
  for (const ta of allTypeAmounts) {
    if (!typeAmountsByExpense.has(ta.expenseId))
      typeAmountsByExpense.set(ta.expenseId, []);
    typeAmountsByExpense
      .get(ta.expenseId)!
      .push({ expenseTypeId: ta.expenseTypeId, amount: ta.amount });
  }

  // Footer totals
  const fundTotals = new Map<string, number>();
  for (const s of allSplits) {
    fundTotals.set(
      s.incomeSourceId,
      (fundTotals.get(s.incomeSourceId) ?? 0) + parseFloat(s.amountUsd),
    );
  }
  for (const e of rows) {
    if (e.incomeSourceId && !splitExpenseIds.has(e.id)) {
      fundTotals.set(
        e.incomeSourceId,
        (fundTotals.get(e.incomeSourceId) ?? 0) + parseFloat(e.amountUsd),
      );
    }
  }

  const typeMap = Object.fromEntries(rawTypes.map((t) => [t.id, t]));
  const typeTotals = new Map<string, number>();
  for (const ta of allTypeAmounts) {
    typeTotals.set(
      ta.expenseTypeId,
      (typeTotals.get(ta.expenseTypeId) ?? 0) + parseFloat(ta.amount),
    );
  }

  const grandTotalUsd = rows.reduce(
    (sum, e) => sum + parseFloat(e.amountUsd),
    0,
  );
  const grandTotalBs = rows.reduce(
    (sum, e) => sum + parseFloat(e.amountBs ?? "0"),
    0,
  );
  const memberMap = Object.fromEntries(
    members.map((m) => [m.id, m.nickname ?? "—"]),
  );
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const classifiedTotal = [...typeTotals.values()].reduce((s, v) => s + v, 0);
  const unclassifiedTotal = grandTotalUsd - classifiedTotal;
  const sortedTypes = [...typeTotals.entries()].sort((a, b) => b[1] - a[1]);

  const memberTotals = new Map<string, { name: string; total: number }>();
  for (const e of rows) {
    if (e.memberId) {
      const name = memberMap[e.memberId] ?? "—";
      const prev = memberTotals.get(e.memberId) ?? { name, total: 0 };
      memberTotals.set(e.memberId, {
        name,
        total: prev.total + parseFloat(e.amountUsd),
      });
    }
  }
  const sortedMembers = [...memberTotals.entries()].sort(
    (a, b) => b[1].total - a[1].total,
  );
  const unassignedTotal = rows
    .filter((e) => !e.memberId)
    .reduce((s, e) => s + parseFloat(e.amountUsd), 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <AddExpenseModal
          members={members}
          sources={sources}
          expenseTypes={rawTypes}
        />
      </div>

      {/* Table */}
      <Card className="min-w-0">
        {rows.length === 0 ? (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aún no hay gastos. ¡Agrega el primero!
          </CardContent>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead>Miembro</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead className="text-right">Bs</TableHead>
                  <TableHead className="text-right">Fecha</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const src = e.incomeSourceId
                    ? sourceMap[e.incomeSourceId]
                    : null;
                  const expTypAmts = typeAmountsByExpense.get(e.id) ?? [];
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <span className="font-medium">{e.description}</span>
                        {src && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-px text-xs font-medium text-green-700">
                            <span
                              className="inline-block size-1.5 rounded-full"
                              style={{ background: src.color ?? "#16A34A" }}
                            />
                            {src.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expTypAmts.length === 0 ? (
                          <span className="text-xs text-muted-foreground/40">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {expTypAmts.map((ta, i) => {
                              const tinfo = typeMap[ta.expenseTypeId];
                              const tcolor = tinfo?.color ?? "#7C3AED";
                              return (
                                <span
                                  key={i}
                                  className="rounded-full px-2 py-px text-xs font-semibold whitespace-nowrap"
                                  style={{
                                    background: `${tcolor}22`,
                                    color: tcolor,
                                  }}
                                >
                                  {tinfo?.name ?? "?"} · $
                                  {parseFloat(ta.amount).toFixed(2)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.merchant ?? "—"}
                      </TableCell>
                      <TableCell>
                        {e.memberId ? (
                          <span className="rounded-full bg-muted px-2 py-px text-xs font-medium text-muted-foreground">
                            {memberMap[e.memberId] ?? "—"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${e.amountUsd}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {e.amountBs ? `${e.amountBs} Bs` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {e.occurredAt
                          ? new Date(e.occurredAt).toLocaleDateString("es-VE")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-0.5">
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
                            expenseSplits={(
                              splitsByExpense.get(e.id) ?? []
                            ).map((s) => ({
                              incomeSourceId: s.incomeSourceId,
                              amountUsd: s.amountUsd,
                              sourceName:
                                sourceMap[s.incomeSourceId]?.name ??
                                s.incomeSourceId,
                              sourceColor:
                                sourceMap[s.incomeSourceId]?.color ?? null,
                            }))}
                            initialTypeAmounts={
                              typeAmountsByExpense.get(e.id) ?? []
                            }
                            members={members}
                            sources={sources}
                            expenseTypes={rawTypes}
                          />
                          <DeleteExpenseButton
                            id={e.id}
                            label={e.description}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        )}
      </Card>

      {/* Summary footer */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground">
                Resumen de gastos ({rows.length} registros)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                últimos 100 movimientos
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* By fund + By type */}
            <div className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
              {/* By fund */}
              <div className="p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Por fondo
                </p>
                {fundTotals.size === 0 ? (
                  <p className="text-sm text-muted-foreground/40">
                    Sin asignación de fondos
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[...fundTotals.entries()]
                      .sort((a, b) => b[1] - a[1])
                      .map(([sourceId, total]) => {
                        const src = sourceMap[sourceId];
                        return (
                          <div
                            key={sourceId}
                            className="flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1.5 text-sm text-foreground">
                              <span
                                className="inline-block size-2 shrink-0 rounded-full"
                                style={{ background: src?.color ?? "#94A3B8" }}
                              />
                              {src?.name ?? sourceId}
                            </span>
                            <span className="text-sm font-bold text-red-600">
                              ${total.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* By type */}
              <div className="p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Por tipo
                  </p>
                  {classifiedTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ${classifiedTotal.toFixed(2)} de $
                      {grandTotalUsd.toFixed(2)}
                    </span>
                  )}
                </div>
                {typeTotals.size === 0 ? (
                  <p className="text-sm text-muted-foreground/40">
                    Sin clasificación por tipo
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {sortedTypes.map(([expenseTypeId, total]) => {
                      const tinfo = typeMap[expenseTypeId];
                      const tcolor = tinfo?.color ?? "#7C3AED";
                      const pct =
                        classifiedTotal > 0
                          ? (total / classifiedTotal) * 100
                          : 0;
                      return (
                        <div key={expenseTypeId}>
                          <div className="mb-1 flex items-center justify-between">
                            <span
                              className="rounded-full px-2 py-px text-xs font-semibold"
                              style={{
                                background: `${tcolor}22`,
                                color: tcolor,
                              }}
                            >
                              {tinfo?.name ?? "?"}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {pct.toFixed(1)}%
                              </span>
                              <span className="text-sm font-bold text-red-600">
                                ${total.toFixed(2)}
                              </span>
                            </span>
                          </div>
                          <div
                            className="h-1 overflow-hidden rounded-full"
                            style={{ background: `${tcolor}22` }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: tcolor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {classifiedTotal > 0 && unclassifiedTotal > 0.001 && (
                  <div className="mt-3 flex justify-between border-t pt-2.5 text-xs text-muted-foreground">
                    <span>Sin clasificar</span>
                    <span>${unclassifiedTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* By member */}
            {sortedMembers.length > 0 && (
              <div className="border-t p-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Por miembro
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {sortedMembers.map(([memberId, { name, total }]) => {
                    const pct =
                      grandTotalUsd > 0 ? (total / grandTotalUsd) * 100 : 0;
                    return (
                      <div
                        key={memberId}
                        className="rounded-lg bg-muted/50 p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="rounded-full bg-blue-100 px-2 py-px text-xs font-semibold text-blue-700">
                            {name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-base font-bold text-red-600">
                          ${total.toFixed(2)}
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {unassignedTotal > 0.001 && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs italic text-muted-foreground">
                          Sin asignar
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {grandTotalUsd > 0
                            ? ((unassignedTotal / grandTotalUsd) * 100).toFixed(
                                1,
                              )
                            : "0"}
                          %
                        </span>
                      </div>
                      <p className="text-base font-bold text-muted-foreground">
                        ${unassignedTotal.toFixed(2)}
                      </p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-muted-foreground/40"
                          style={{
                            width: `${grandTotalUsd > 0 ? (unassignedTotal / grandTotalUsd) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Grand total */}
            <div className="flex items-center justify-end gap-8 border-t-2 bg-muted/30 px-5 py-4">
              {grandTotalBs > 0 && (
                <span className="text-sm text-muted-foreground">
                  Total Bs:{" "}
                  <strong>
                    {grandTotalBs.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    Bs
                  </strong>
                </span>
              )}
              <span className="text-base text-red-600">
                Total USD: <strong>${grandTotalUsd.toFixed(2)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
