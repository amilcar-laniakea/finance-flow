"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, List, BarChart2 } from "lucide-react";
import { AddExpenseModal } from "./AddExpenseModal";
import { EditExpenseModal } from "./EditExpenseModal";
import { DeleteExpenseButton } from "./DeleteExpenseButton";

type ExpenseRow = {
  id: string;
  description: string;
  merchant: string | null;
  memberId: string | null;
  incomeSourceId: string | null;
  amountUsd: string;
  amountBs: string | null;
  exchangeRate: string | null;
  period: string | null;
  occurredAt: string | null;
};

type Member = { id: string; nickname: string | null };
type Source = { id: string; name: string; color: string | null; balance: number };
type ExpenseType = { id: string; name: string; color: string | null };
type Split = { incomeSourceId: string; amountUsd: string };
type TypeAmount = { expenseTypeId: string; amount: string };

interface Props {
  rows: ExpenseRow[];
  members: Member[];
  sources: Source[];
  expenseTypes: ExpenseType[];
  splitsByExpense: Record<string, Split[]>;
  typeAmountsByExpense: Record<string, TypeAmount[]>;
}

export function ExpensesClient({
  rows,
  members,
  sources,
  expenseTypes,
  splitsByExpense,
  typeAmountsByExpense,
}: Props) {
  // Active tab
  const [activeTab, setActiveTab] = useState<"list" | "summary">("list");

  // Filters
  const [search, setSearch] = useState("");
  const [filterMember, setFilterMember] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Scroll mirror refs for top scrollbar
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableInnerWidth, setTableInnerWidth] = useState(0);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.nickname ?? "—"])),
    [members],
  );
  const sourceMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.id, s])),
    [sources],
  );
  const typeMap = useMemo(
    () => Object.fromEntries(expenseTypes.map((t) => [t.id, t])),
    [expenseTypes],
  );

  const filtered = useMemo(() => {
    return rows.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const d = (e.description ?? "").toLowerCase().includes(q);
        const m = (e.merchant ?? "").toLowerCase().includes(q);
        if (!d && !m) return false;
      }
      if (filterMember !== "all" && e.memberId !== filterMember) return false;
      if (filterSource !== "all") {
        const splits = splitsByExpense[e.id] ?? [];
        const direct = e.incomeSourceId === filterSource;
        const split = splits.some((s) => s.incomeSourceId === filterSource);
        if (!direct && !split) return false;
      }
      if (filterType !== "all") {
        const ta = typeAmountsByExpense[e.id] ?? [];
        if (!ta.some((x) => x.expenseTypeId === filterType)) return false;
      }
      return true;
    });
  }, [rows, search, filterMember, filterSource, filterType, splitsByExpense, typeAmountsByExpense]);

  const totalPages = perPage === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = perPage === 0 ? filtered : filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const from = filtered.length === 0 ? 0 : perPage === 0 ? 1 : (safePage - 1) * perPage + 1;
  const to = perPage === 0 ? filtered.length : Math.min(safePage * perPage, filtered.length);

  // Clamp page when filtered set shrinks
  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [totalPages, page]);

  // Measure table inner scroll width to drive the top mirror scrollbar
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const update = () => {
      setTableInnerWidth(el.scrollWidth);
      setNeedsHScroll(el.scrollWidth > el.clientWidth);
    };
    update();
    const ob = new ResizeObserver(update);
    ob.observe(el);
    return () => ob.disconnect();
  }, [paginated]);

  function syncTopFromBottom(e: React.UIEvent<HTMLDivElement>) {
    if (topScrollRef.current)
      topScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
  }
  function syncBottomFromTop(e: React.UIEvent<HTMLDivElement>) {
    if (tableScrollRef.current)
      tableScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
  }

  const hasFilters =
    search.trim() ||
    filterMember !== "all" ||
    filterSource !== "all" ||
    filterType !== "all";

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleMember(v: string) { setFilterMember(v); setPage(1); }
  function handleSource(v: string) { setFilterSource(v); setPage(1); }
  function handleType(v: string) { setFilterType(v); setPage(1); }
  function clearFilters() {
    setSearch(""); setFilterMember("all"); setFilterSource("all"); setFilterType("all"); setPage(1);
  }

  // Summary computed from ALL filtered rows (not just the current page)
  const summary = useMemo(() => {
    const fundTotals = new Map<string, number>();
    const typeTotals = new Map<string, number>();
    const memberTotals = new Map<string, { name: string; total: number }>();

    for (const e of filtered) {
      const splits = splitsByExpense[e.id] ?? [];
      if (splits.length > 0) {
        for (const s of splits) {
          fundTotals.set(s.incomeSourceId, (fundTotals.get(s.incomeSourceId) ?? 0) + parseFloat(s.amountUsd));
        }
      } else if (e.incomeSourceId) {
        fundTotals.set(e.incomeSourceId, (fundTotals.get(e.incomeSourceId) ?? 0) + parseFloat(e.amountUsd));
      }

      for (const ta of typeAmountsByExpense[e.id] ?? []) {
        typeTotals.set(ta.expenseTypeId, (typeTotals.get(ta.expenseTypeId) ?? 0) + parseFloat(ta.amount));
      }

      if (e.memberId) {
        const name = memberMap[e.memberId] ?? "—";
        const prev = memberTotals.get(e.memberId) ?? { name, total: 0 };
        memberTotals.set(e.memberId, { name, total: prev.total + parseFloat(e.amountUsd) });
      }
    }

    const grandTotalUsd = filtered.reduce((s, e) => s + parseFloat(e.amountUsd), 0);
    const grandTotalBs = filtered.reduce((s, e) => s + parseFloat(e.amountBs ?? "0"), 0);
    const classifiedTotal = [...typeTotals.values()].reduce((s, v) => s + v, 0);
    const unclassifiedTotal = grandTotalUsd - classifiedTotal;
    const unassignedTotal = filtered.filter((e) => !e.memberId).reduce((s, e) => s + parseFloat(e.amountUsd), 0);

    return {
      fundTotals,
      typeTotals,
      memberTotals,
      grandTotalUsd,
      grandTotalBs,
      classifiedTotal,
      unclassifiedTotal,
      unassignedTotal,
      sortedTypes: [...typeTotals.entries()].sort((a, b) => b[1] - a[1]),
      sortedMembers: [...memberTotals.entries()].sort((a, b) => b[1].total - a[1].total),
    };
  }, [filtered, splitsByExpense, typeAmountsByExpense, memberMap]);

  const selectCls = "h-9 w-[130px] min-w-0 rounded-md border border-border bg-background text-foreground text-[13px] outline-none px-2.5 cursor-pointer";
  const pgBtnCls = "flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors";

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active
        ? "border-foreground text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Page header — title + action */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filtered.length !== rows.length
              ? `${filtered.length} de ${rows.length} registros`
              : `${rows.length} registros`}
          </p>
        </div>
        <AddExpenseModal members={members} sources={sources} expenseTypes={expenseTypes} />
      </div>

      {/* Sub-section tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab("list")} className={tabCls(activeTab === "list")}>
          <List size={14} /> Lista
        </button>
        <button onClick={() => setActiveTab("summary")} className={tabCls(activeTab === "summary")}>
          <BarChart2 size={14} /> Resumen
        </button>
      </div>

      {/* ── Lista tab ── */}
      {activeTab === "list" && <>

      {/* Filter bar */}
      <div className="px-4 pt-5 pb-3 border-b border-border">
      <div className="flex flex-wrap gap-x-2 gap-y-5 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar descripción o comercio…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-8 rounded-md border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 outline-none"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="relative">
          <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-[10px] font-medium text-muted-foreground">
            Miembro
          </span>
          <select value={filterMember} onChange={(e) => handleMember(e.target.value)} className={selectCls}>
            <option value="all">Todos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.nickname ?? m.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-[10px] font-medium text-muted-foreground">
            Fondo
          </span>
          <select value={filterSource} onChange={(e) => handleSource(e.target.value)} className={selectCls}>
            <option value="all">Todos</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <span className="absolute -top-2 left-2 z-10 bg-background px-1 text-[10px] font-medium text-muted-foreground">
            Tipo
          </span>
          <select value={filterType} onChange={(e) => handleType(e.target.value)} className={selectCls}>
            <option value="all">Todos</option>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 h-9 px-3 rounded-md border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>
      </div>

      {/* Table / Card list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {hasFilters
              ? "Ningún gasto coincide con los filtros."
              : "Aún no hay gastos. ¡Agrega el primero!"}
          </p>
        ) : (
          <>
            {/* Mobile — card list */}
            <div className="md:hidden divide-y divide-border/60">
              {paginated.map((e) => {
                const src = e.incomeSourceId ? sourceMap[e.incomeSourceId] : null;
                const expTypAmts = typeAmountsByExpense[e.id] ?? [];
                return (
                  <div key={e.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground">{e.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {e.merchant && (
                            <span className="text-xs text-muted-foreground">{e.merchant}</span>
                          )}
                          {src && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/40 px-2 py-px text-xs font-medium text-green-700 dark:text-green-400">
                              <span className="inline-block size-1.5 rounded-full" style={{ background: src.color ?? "#16A34A" }} />
                              {src.name}
                            </span>
                          )}
                        </div>
                        {expTypAmts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {expTypAmts.map((ta, i) => {
                              const tinfo = typeMap[ta.expenseTypeId];
                              const tcolor = tinfo?.color ?? "#7C3AED";
                              return (
                                <span key={i} className="rounded-full px-2 py-px text-xs font-semibold" style={{ background: `${tcolor}22`, color: tcolor }}>
                                  {tinfo?.name ?? "?"}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {e.memberId && (
                            <span className="rounded-full bg-muted px-2 py-px text-xs text-muted-foreground">
                              {memberMap[e.memberId] ?? "—"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {e.occurredAt ? new Date(e.occurredAt).toLocaleDateString("es-VE") : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="font-bold text-sm text-red-600 dark:text-red-400">
                          ${parseFloat(e.amountUsd).toFixed(2)}
                        </span>
                        {e.amountBs && (
                          <span className="text-xs text-muted-foreground">{e.amountBs} Bs</span>
                        )}
                        <div className="flex gap-0.5 mt-0.5">
                          <EditExpenseModal
                            expense={{
                              id: e.id, description: e.description, merchant: e.merchant,
                              memberId: e.memberId, amountUsd: e.amountUsd, amountBs: e.amountBs,
                              exchangeRate: e.exchangeRate, period: e.period ? new Date(e.period) : null,
                            }}
                            expenseSplits={(splitsByExpense[e.id] ?? []).map((s) => ({
                              incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd,
                              sourceName: sourceMap[s.incomeSourceId]?.name ?? s.incomeSourceId,
                              sourceColor: sourceMap[s.incomeSourceId]?.color ?? null,
                            }))}
                            initialTypeAmounts={typeAmountsByExpense[e.id] ?? []}
                            members={members} sources={sources} expenseTypes={expenseTypes}
                          />
                          <DeleteExpenseButton id={e.id} label={e.description} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop — table with mirrored top scrollbar */}
            <div className="hidden md:block">
              {/* Mirror scrollbar at the top — only shown when there is something to scroll */}
              {needsHScroll && (
                <div
                  ref={topScrollRef}
                  onScroll={syncBottomFromTop}
                  className="overflow-x-scroll overflow-y-hidden border-b border-border"
                  style={{ height: 12 }}
                >
                  <div style={{ width: tableInnerWidth, height: 1 }} />
                </div>
              )}

              {/* Actual table */}
              <div ref={tableScrollRef} onScroll={syncTopFromBottom} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs">
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Descripción</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Comercio</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Miembro</th>
                      <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide">USD</th>
                      <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide">Bs</th>
                      <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide">Fecha</th>
                      <th className="w-20 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((e) => {
                      const src = e.incomeSourceId ? sourceMap[e.incomeSourceId] : null;
                      const expTypAmts = typeAmountsByExpense[e.id] ?? [];
                      return (
                        <tr key={e.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{e.description}</span>
                            {src && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/40 px-2 py-px text-xs font-medium text-green-700 dark:text-green-400">
                                <span className="inline-block size-1.5 rounded-full" style={{ background: src.color ?? "#16A34A" }} />
                                {src.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {expTypAmts.length === 0 ? (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {expTypAmts.map((ta, i) => {
                                  const tinfo = typeMap[ta.expenseTypeId];
                                  const tcolor = tinfo?.color ?? "#7C3AED";
                                  return (
                                    <span key={i} className="rounded-full px-2 py-px text-xs font-semibold whitespace-nowrap" style={{ background: `${tcolor}22`, color: tcolor }}>
                                      {tinfo?.name ?? "?"} · ${parseFloat(ta.amount).toFixed(2)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-[13px]">{e.merchant ?? "—"}</td>
                          <td className="px-4 py-3">
                            {e.memberId ? (
                              <span className="rounded-full bg-muted px-2 py-px text-xs font-medium text-muted-foreground">
                                {memberMap[e.memberId] ?? "—"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                            ${parseFloat(e.amountUsd).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-[13px]">
                            {e.amountBs ? `${e.amountBs} Bs` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-[13px]">
                            {e.occurredAt ? new Date(e.occurredAt).toLocaleDateString("es-VE") : "—"}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center justify-center gap-0.5">
                              <EditExpenseModal
                                expense={{
                                  id: e.id, description: e.description, merchant: e.merchant,
                                  memberId: e.memberId, amountUsd: e.amountUsd, amountBs: e.amountBs,
                                  exchangeRate: e.exchangeRate, period: e.period ? new Date(e.period) : null,
                                }}
                                expenseSplits={(splitsByExpense[e.id] ?? []).map((s) => ({
                                  incomeSourceId: s.incomeSourceId, amountUsd: s.amountUsd,
                                  sourceName: sourceMap[s.incomeSourceId]?.name ?? s.incomeSourceId,
                                  sourceColor: sourceMap[s.incomeSourceId]?.color ?? null,
                                }))}
                                initialTypeAmounts={typeAmountsByExpense[e.id] ?? []}
                                members={members} sources={sources} expenseTypes={expenseTypes}
                              />
                              <DeleteExpenseButton id={e.id} label={e.description} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Filas por página</span>
                <div className="relative">
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="h-8 appearance-none rounded-md border border-border bg-background text-foreground text-xs pl-2 pr-7 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={0}>Todos</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {from}–{to} de {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={safePage === 1 || perPage === 0} className={pgBtnCls} title="Primera página">
                    <ChevronsLeft size={13} />
                  </button>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1 || perPage === 0} className={pgBtnCls} title="Página anterior">
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-xs text-foreground px-2 tabular-nums">
                    {perPage === 0 ? "1 / 1" : `${safePage} / ${totalPages}`}
                  </span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages || perPage === 0} className={pgBtnCls} title="Página siguiente">
                    <ChevronRight size={13} />
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={safePage >= totalPages || perPage === 0} className={pgBtnCls} title="Última página">
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      </>}

      {/* ── Resumen tab ── */}
      {activeTab === "summary" && filtered.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <p className="text-sm font-bold text-foreground">
              Resumen
              {hasFilters && <span className="font-normal text-muted-foreground ml-1">· filtrado</span>}
            </p>
            <span className="text-xs text-muted-foreground">
              {hasFilters
                ? `${filtered.length} de ${rows.length} registros`
                : `${rows.length} registros · últimos 200`}
            </span>
          </div>

          <div className="grid grid-cols-1 divide-y border-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Por fondo</p>
              {summary.fundTotals.size === 0 ? (
                <p className="text-sm text-muted-foreground/40">Sin asignación</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...summary.fundTotals.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([sourceId, total]) => {
                      const src = sourceMap[sourceId];
                      return (
                        <div key={sourceId} className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm text-foreground">
                            <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: src?.color ?? "#94A3B8" }} />
                            {src?.name ?? sourceId}
                          </span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">${total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Por tipo</p>
                {summary.classifiedTotal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ${summary.classifiedTotal.toFixed(2)} de ${summary.grandTotalUsd.toFixed(2)}
                  </span>
                )}
              </div>
              {summary.typeTotals.size === 0 ? (
                <p className="text-sm text-muted-foreground/40">Sin clasificación</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {summary.sortedTypes.map(([typeId, total]) => {
                    const tinfo = typeMap[typeId];
                    const tcolor = tinfo?.color ?? "#7C3AED";
                    const pct = summary.classifiedTotal > 0 ? (total / summary.classifiedTotal) * 100 : 0;
                    return (
                      <div key={typeId}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-full bg-muted px-2 py-px text-xs font-semibold text-foreground">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: tcolor }} />
                            <span className="truncate">{tinfo?.name ?? "?"}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">${total.toFixed(2)}</span>
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tcolor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {summary.classifiedTotal > 0 && summary.unclassifiedTotal > 0.001 && (
                <div className="mt-3 flex justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
                  <span>Sin clasificar</span>
                  <span>${summary.unclassifiedTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {summary.sortedMembers.length > 0 && (
            <div className="border-t border-border p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Por miembro</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {summary.sortedMembers.map(([memberId, { name, total }]) => {
                  const pct = summary.grandTotalUsd > 0 ? (total / summary.grandTotalUsd) * 100 : 0;
                  return (
                    <div key={memberId} className="rounded-lg bg-muted/50 p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-1.5">
                        <span className="min-w-0 flex-1 truncate rounded-full bg-muted px-2 py-px text-xs font-semibold text-foreground">
                          {name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                      </div>
                      <p className="text-base font-bold text-red-600 dark:text-red-400">${total.toFixed(2)}</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {summary.unassignedTotal > 0.001 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs italic text-muted-foreground">Sin asignar</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {summary.grandTotalUsd > 0
                          ? ((summary.unassignedTotal / summary.grandTotalUsd) * 100).toFixed(1)
                          : "0"}%
                      </span>
                    </div>
                    <p className="text-base font-bold text-muted-foreground">${summary.unassignedTotal.toFixed(2)}</p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-muted-foreground/40" style={{
                        width: `${summary.grandTotalUsd > 0 ? (summary.unassignedTotal / summary.grandTotalUsd) * 100 : 0}%`
                      }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-8 border-t-2 border-border bg-muted/30 px-5 py-4">
            {summary.grandTotalBs > 0 && (
              <span className="text-sm text-muted-foreground">
                Total Bs:{" "}
                <strong>
                  {summary.grandTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs
                </strong>
              </span>
            )}
            <span className="text-base text-red-600 dark:text-red-400">
              Total USD: <strong>${summary.grandTotalUsd.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
