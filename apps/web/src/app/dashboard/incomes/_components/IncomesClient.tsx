"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, List, BarChart2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";
import { AddIncomeModal } from "./AddIncomeModal";
import { EditIncomeModal } from "./EditIncomeModal";
import { DeleteIncomeButton } from "./DeleteIncomeButton";

type IncomeRow = {
  id: string;
  sourceId: string | null;
  source: string | null;
  description: string | null;
  memberId: string | null;
  amountUsd: string;
  amountBs: string | null;
  exchangeRate: string | null;
  period: string | null;
  occurredAt: string | null;
};

type SourceInfo = { id: string; name: string; color: string | null };
type MemberInfo = { id: string; nickname: string | null };
type DistEntry = { memberId: string | null; fullName: string | null; amountUsd: string };

interface Props {
  rows: IncomeRow[];
  sources: SourceInfo[];
  members: MemberInfo[];
  distsByIncome: Record<string, DistEntry[]>;
}

const PER_PAGE_OPTIONS = [10, 20, 50] as const;

function tabCls(active: boolean) {
  return `flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
    active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
  }`;
}

export function IncomesClient({ rows, sources, members, distsByIncome }: Props) {
  const [activeTab, setActiveTab] = useState<"list" | "summary">("list");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | "all">(20);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableInnerWidth, setTableInnerWidth] = useState(0);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  const sourceMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.id, s])),
    [sources],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const src = r.sourceId ? sourceMap[r.sourceId] : null;
      if (filterSource !== "all" && r.sourceId !== filterSource) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inDesc = (r.description ?? "").toLowerCase().includes(q);
        const inSrc = (src?.name ?? r.source ?? "").toLowerCase().includes(q);
        if (!inDesc && !inSrc) return false;
      }
      return true;
    });
  }, [rows, search, filterSource, sourceMap]);

  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = perPage === "all" ? filtered : filtered.slice((safePage - 1) * perPage, safePage * (perPage as number));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

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

  const syncTopFromBottom = () => {
    if (topScrollRef.current && tableScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
  };
  const syncBottomFromTop = () => {
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleSource = (v: string) => { setFilterSource(v); setPage(1); };
  const clearAll = () => { setSearch(""); setFilterSource("all"); setPage(1); };
  const hasFilters = search || filterSource !== "all";

  const totalUsd = filtered.reduce((s, r) => s + parseFloat(r.amountUsd), 0);

  const summaryBySource = useMemo(() => {
    const m: Record<string, { name: string; color: string | null; usd: number; count: number }> = {};
    for (const r of rows) {
      const src = r.sourceId ? sourceMap[r.sourceId] : null;
      const key = src?.id ?? "__none__";
      if (!m[key]) m[key] = { name: src?.name ?? r.source ?? "Sin fuente", color: src?.color ?? null, usd: 0, count: 0 };
      m[key].usd += parseFloat(r.amountUsd);
      m[key].count++;
    }
    return Object.values(m).sort((a, b) => b.usd - a.usd);
  }, [rows, sourceMap]);

  const grandTotal = summaryBySource.reduce((s, x) => s + x.usd, 0);

  return (
    <div className="flex min-w-0 flex-col">
      {/* Section header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingresos</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {rows.length} registro{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddIncomeModal sources={sources} members={members} />
      </div>

      {/* Card with tabs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab("list")} className={tabCls(activeTab === "list")}>
            <List size={14} /> Lista
          </button>
          <button onClick={() => setActiveTab("summary")} className={tabCls(activeTab === "summary")}>
            <BarChart2 size={14} /> Resumen
          </button>
        </div>

        {activeTab === "list" && (
          <>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-9 pl-8 pr-8 w-[180px] sm:w-[220px] rounded-md border border-border bg-background text-foreground text-[13px] placeholder:text-muted-foreground/60 outline-none"
                />
                {search && (
                  <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Source filter */}
              <div className="relative">
                <span className="absolute -top-2 left-2 z-10 bg-card px-1 text-[10px] font-medium text-muted-foreground">
                  Fuente
                </span>
                <select
                  value={filterSource}
                  onChange={(e) => handleSource(e.target.value)}
                  className="h-9 w-[130px] rounded-md border border-border bg-card text-foreground text-[13px] outline-none px-2.5 cursor-pointer"
                >
                  <option value="all">Todos</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <button onClick={clearAll} className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  <X size={11} /> Limpiar
                </button>
              )}

              {filtered.length > 0 && (
                <span className="ml-auto text-[12px] text-muted-foreground">
                  ${totalUsd.toFixed(2)} total
                </span>
              )}
            </div>

            {/* Top mirror scrollbar */}
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

            {/* Mobile card list */}
            <div className="block md:hidden divide-y divide-border/60">
              {paginated.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-muted-foreground">
                  {hasFilters ? "No hay resultados." : "Sin ingresos registrados."}
                </p>
              ) : paginated.map((r) => {
                const src = r.sourceId ? sourceMap[r.sourceId] : null;
                const dists = distsByIncome[r.id] ?? [];
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400">
                        {src && <span className="size-2 rounded-full shrink-0 inline-block" style={{ background: src.color ?? "#16A34A" }} />}
                        {src?.name ?? r.source ?? "—"}
                      </div>
                      <span className="font-bold text-sm text-green-600 dark:text-green-400 shrink-0">
                        ${parseFloat(r.amountUsd).toFixed(2)}
                      </span>
                    </div>
                    {r.description && <p className="text-[13px] text-muted-foreground mb-1">{r.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">
                        {r.occurredAt ? new Date(r.occurredAt).toLocaleDateString("es-VE") : "—"}
                        {r.amountBs ? ` · ${r.amountBs} Bs` : ""}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <EditIncomeModal
                          income={{ id: r.id, source: r.source, sourceId: r.sourceId, description: r.description, memberId: r.memberId, amountUsd: r.amountUsd, amountBs: r.amountBs, exchangeRate: r.exchangeRate, period: r.period as any }}
                          sources={sources}
                          members={members}
                          initialDists={dists}
                        />
                        <DeleteIncomeButton id={r.id} label={src?.name ?? r.source ?? r.description ?? r.id} />
                      </div>
                    </div>
                    {dists.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dists.map((d, idx) => (
                          <span key={idx} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            d.memberId ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                          }`}>
                            {d.fullName ?? "Fondo hogar"} · ${parseFloat(d.amountUsd).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div ref={tableScrollRef} onScroll={syncTopFromBottom} className="hidden md:block overflow-x-auto">
              {paginated.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-muted-foreground">
                  {hasFilters ? "No hay resultados." : "Sin ingresos registrados."}
                </p>
              ) : (
                <table className="w-full border-collapse text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-muted/50">
                      <th className="text-left px-4 py-2.5">Fuente</th>
                      <th className="text-left px-4 py-2.5">Descripción</th>
                      <th className="text-right px-4 py-2.5">USD</th>
                      <th className="text-right px-4 py-2.5">Bs</th>
                      <th className="text-right px-4 py-2.5">Fecha</th>
                      <th className="text-center px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r) => {
                      const src = r.sourceId ? sourceMap[r.sourceId] : null;
                      const label = src?.name ?? r.source ?? r.description ?? r.id;
                      const dists = distsByIncome[r.id] ?? [];
                      return (
                        <React.Fragment key={r.id}>
                          <tr className={dists.length > 0 ? "" : "border-b border-border/60"}>
                            <td className="px-4 py-3">
                              {src ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="size-2 rounded-full shrink-0 inline-block" style={{ background: src.color ?? "#16A34A" }} />
                                  <span className="font-medium text-green-600 dark:text-green-400">{src.name}</span>
                                </span>
                              ) : (
                                <span className="font-medium text-green-600 dark:text-green-400">{r.source ?? "—"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                              ${parseFloat(r.amountUsd).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {r.amountBs ? `${r.amountBs} Bs` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {r.occurredAt ? new Date(r.occurredAt).toLocaleDateString("es-VE") : "—"}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <EditIncomeModal
                                  income={{ id: r.id, source: r.source, sourceId: r.sourceId, description: r.description, memberId: r.memberId, amountUsd: r.amountUsd, amountBs: r.amountBs, exchangeRate: r.exchangeRate, period: r.period as any }}
                                  sources={sources}
                                  members={members}
                                  initialDists={dists}
                                />
                                <DeleteIncomeButton id={r.id} label={label} />
                              </div>
                            </td>
                          </tr>

                          {dists.length > 0 && (
                            <tr key={`${r.id}-dist`} className="border-b border-border/60">
                              <td colSpan={6} className="px-4 pb-2.5 pl-6">
                                <div className="flex gap-1.5 flex-wrap items-center">
                                  <span className="text-[11px] text-muted-foreground mr-0.5">Distribución:</span>
                                  {dists.map((d, idx) => (
                                    <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      d.memberId ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                                    }`}>
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

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border text-[13px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-[12px]">Filas por página</span>
                  <div className="relative">
                  <select
                    value={perPage === "all" ? "all" : String(perPage)}
                    onChange={(e) => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}
                    className="h-7 appearance-none pl-2 pr-7 rounded border border-border bg-background text-foreground text-[12px] outline-none cursor-pointer"
                  >
                    {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="all">Todos</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] mr-1">{safePage} / {totalPages}</span>
                  <button onClick={() => setPage(1)} disabled={safePage === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronsLeft size={14} /></button>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronLeft size={14} /></button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronRight size={14} /></button>
                  <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronsRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "summary" && (
          <div className="p-5">
            {summaryBySource.length === 0 ? (
              <p className="text-center text-[13px] text-muted-foreground py-6">Sin datos.</p>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mb-4">
                  {summaryBySource.map((s) => (
                    <div key={s.name} className="bg-background border border-border rounded-lg p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        {s.color && <span className="size-2.5 rounded-full shrink-0 inline-block" style={{ background: s.color }} />}
                        <span className="font-semibold text-[13px] text-foreground">{s.name}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[13px]">
                          <span className="text-muted-foreground">Total USD</span>
                          <span className="font-bold text-green-600 dark:text-green-400">${s.usd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[13px]">
                          <span className="text-muted-foreground">Ingresos</span>
                          <span className="font-semibold text-foreground">{s.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 dark:bg-green-400" style={{ width: grandTotal > 0 ? `${(s.usd / grandTotal) * 100}%` : "0%" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="text-[13px] font-semibold text-foreground">Total</span>
                  <span className="font-bold text-green-600 dark:text-green-400">${grandTotal.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
