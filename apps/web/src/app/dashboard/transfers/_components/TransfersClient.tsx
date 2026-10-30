"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ArrowLeftRight, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";
import { AddTransferModal } from "./AddTransferModal";
import { DeleteTransferButton } from "./DeleteTransferButton";

type TransferRow = {
  id: string;
  transferType: string;
  fromSourceId: string | null;
  toSourceId: string | null;
  fromMemberId: string | null;
  toMemberId: string | null;
  amountUsd: string;
  description: string | null;
  period: string | null;
  groupId: string | null;
};

type GroupedFundRow = {
  key: string;
  representativeId: string;
  fromSourceId: string | null;
  toSourceId: string | null;
  totalAmount: number;
  description: string | null;
  period: string | null;
  splits: { id: string; memberId: string | null; amountUsd: number }[];
};

type SourceInfo = { id: string; name: string; color: string | null; balance: number };
type MemberInfo = { id: string; name: string; balance: number };

interface Props {
  sources: SourceInfo[];
  members: MemberInfo[];
  rows: TransferRow[];
}

const PER_PAGE_OPTIONS = [10, 20, 50] as const;

function tabCls(active: boolean) {
  return `flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
    active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
  }`;
}

function groupFundRows(rows: TransferRow[]): GroupedFundRow[] {
  const grouped = new Map<string, GroupedFundRow>();
  for (const r of rows) {
    const key = r.groupId ?? r.id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        representativeId: r.id,
        fromSourceId: r.fromSourceId,
        toSourceId: r.toSourceId,
        totalAmount: 0,
        description: r.description,
        period: r.period,
        splits: [],
      });
    }
    const g = grouped.get(key)!;
    g.totalAmount += parseFloat(r.amountUsd);
    g.splits.push({ id: r.id, memberId: r.fromMemberId, amountUsd: parseFloat(r.amountUsd) });
  }
  return Array.from(grouped.values());
}

function FundTransferTable({
  rows,
  srcMap,
  usrMap,
}: {
  rows: TransferRow[];
  srcMap: Record<string, SourceInfo>;
  usrMap: Record<string, MemberInfo>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | "all">(20);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableInnerWidth, setTableInnerWidth] = useState(0);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  const grouped = useMemo(() => groupFundRows(rows), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter((g) => (g.description ?? "").toLowerCase().includes(q));
  }, [grouped, search]);

  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = perPage === "all" ? filtered : filtered.slice((safePage - 1) * (perPage as number), safePage * (perPage as number));

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const update = () => { setTableInnerWidth(el.scrollWidth); setNeedsHScroll(el.scrollWidth > el.clientWidth); };
    update();
    const ob = new ResizeObserver(update);
    ob.observe(el);
    return () => ob.disconnect();
  }, [paginated]);

  const syncTopFromBottom = () => { if (topScrollRef.current && tableScrollRef.current) topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft; };
  const syncBottomFromTop = () => { if (tableScrollRef.current && topScrollRef.current) tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft; };

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descripción…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-8 pr-8 w-[200px] sm:w-[260px] rounded-md border border-border bg-background text-foreground text-[13px] placeholder:text-muted-foreground/60 outline-none"
          />
          {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} operación{filtered.length !== 1 ? "es" : ""}</span>
      </div>

      {needsHScroll && (
        <div ref={topScrollRef} onScroll={syncBottomFromTop} className="overflow-x-scroll overflow-y-hidden border-b border-border" style={{ height: 12 }}>
          <div style={{ width: tableInnerWidth, height: 1 }} />
        </div>
      )}

      {/* Mobile */}
      <div className="block md:hidden divide-y divide-border/60">
        {paginated.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">Sin transferencias.</p>
        ) : paginated.map((g) => (
          <div key={g.key} className="p-4">
            <div className="flex items-center gap-1.5 text-[13px] mb-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">{srcMap[g.fromSourceId ?? ""]?.name ?? "—"}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">{srcMap[g.toSourceId ?? ""]?.name ?? "—"}</span>
            </div>
            {g.splits.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {g.splits.map((s) => (
                  <span key={s.id} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {usrMap[s.memberId ?? ""]?.name ?? "—"}: ${s.amountUsd.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
            {g.description && <p className="text-[13px] text-muted-foreground mb-1">{g.description}</p>}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-[12px] text-muted-foreground">
                <span className="font-bold text-blue-600 dark:text-blue-400">${g.totalAmount.toFixed(2)}</span>
                <span>{g.period ? new Date(g.period).toLocaleDateString("es-VE") : "—"}</span>
              </div>
              <DeleteTransferButton id={g.representativeId} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div ref={tableScrollRef} onScroll={syncTopFromBottom} className="hidden md:block overflow-x-auto">
        {paginated.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">Sin transferencias.</p>
        ) : (
          <table className="w-full border-collapse text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-muted/50">
                <th className="text-left px-4 py-2.5">Origen</th>
                <th className="text-left px-1 py-2.5 w-6" />
                <th className="text-left px-4 py-2.5">Destino</th>
                <th className="text-left px-4 py-2.5">Miembros deducidos</th>
                <th className="text-left px-4 py-2.5">Descripción</th>
                <th className="text-right px-4 py-2.5">Monto</th>
                <th className="text-right px-4 py-2.5">Fecha</th>
                <th className="px-2 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((g) => (
                <tr key={g.key} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                      {srcMap[g.fromSourceId ?? ""]?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-1 py-3 text-muted-foreground text-base">→</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                      {srcMap[g.toSourceId ?? ""]?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {g.splits.map((s) => (
                        <span key={s.id} className="text-[12px] text-muted-foreground">
                          {usrMap[s.memberId ?? ""]?.name ?? "—"}{g.splits.length > 1 && `: $${s.amountUsd.toFixed(2)}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                    ${g.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {g.period ? new Date(g.period).toLocaleDateString("es-VE") : "—"}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <DeleteTransferButton id={g.representativeId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
}

function MemberTransferTable({
  rows,
  usrMap,
}: {
  rows: TransferRow[];
  usrMap: Record<string, MemberInfo>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | "all">(20);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableInnerWidth, setTableInnerWidth] = useState(0);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.description ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = perPage === "all" ? filtered : filtered.slice((safePage - 1) * (perPage as number), safePage * (perPage as number));

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const update = () => { setTableInnerWidth(el.scrollWidth); setNeedsHScroll(el.scrollWidth > el.clientWidth); };
    update();
    const ob = new ResizeObserver(update);
    ob.observe(el);
    return () => ob.disconnect();
  }, [paginated]);

  const syncTopFromBottom = () => { if (topScrollRef.current && tableScrollRef.current) topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft; };
  const syncBottomFromTop = () => { if (tableScrollRef.current && topScrollRef.current) tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft; };

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descripción…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-8 pr-8 w-[200px] sm:w-[260px] rounded-md border border-border bg-background text-foreground text-[13px] placeholder:text-muted-foreground/60 outline-none"
          />
          {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {needsHScroll && (
        <div ref={topScrollRef} onScroll={syncBottomFromTop} className="overflow-x-scroll overflow-y-hidden border-b border-border" style={{ height: 12 }}>
          <div style={{ width: tableInnerWidth, height: 1 }} />
        </div>
      )}

      <div className="block md:hidden divide-y divide-border/60">
        {paginated.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">Sin transferencias.</p>
        ) : paginated.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex items-center gap-1.5 text-[13px] mb-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">{usrMap[r.fromMemberId ?? ""]?.name ?? "—"}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">{usrMap[r.toMemberId ?? ""]?.name ?? "—"}</span>
            </div>
            {r.description && <p className="text-[13px] text-muted-foreground mb-1">{r.description}</p>}
            <div className="flex items-center justify-between">
              <div className="flex gap-3 text-[12px] text-muted-foreground">
                <span className="font-bold text-blue-600 dark:text-blue-400">${parseFloat(r.amountUsd).toFixed(2)}</span>
                <span>{r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}</span>
              </div>
              <DeleteTransferButton id={r.id} />
            </div>
          </div>
        ))}
      </div>

      <div ref={tableScrollRef} onScroll={syncTopFromBottom} className="hidden md:block overflow-x-auto">
        {paginated.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">Sin transferencias.</p>
        ) : (
          <table className="w-full border-collapse text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground bg-muted/50">
                <th className="text-left px-4 py-2.5">Origen</th>
                <th className="text-left px-1 py-2.5 w-6" />
                <th className="text-left px-4 py-2.5">Destino</th>
                <th className="text-left px-4 py-2.5">Descripción</th>
                <th className="text-right px-4 py-2.5">Monto</th>
                <th className="text-right px-4 py-2.5">Fecha</th>
                <th className="px-2 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {usrMap[r.fromMemberId ?? ""]?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-1 py-3 text-muted-foreground text-base">→</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                      {usrMap[r.toMemberId ?? ""]?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                    ${parseFloat(r.amountUsd).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <DeleteTransferButton id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
    </div>
  );
}

export function TransfersClient({ sources, members, rows }: Props) {
  const [activeTab, setActiveTab] = useState<"fund" | "member">("fund");

  const srcMap = useMemo(() => Object.fromEntries(sources.map((s) => [s.id, s])), [sources]);
  const usrMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  const fundRows = useMemo(() => rows.filter((r) => r.transferType === "fund"), [rows]);
  const memberRows = useMemo(() => rows.filter((r) => r.transferType === "member"), [rows]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transferencias</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {rows.length} transferencia{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTransferModal sources={sources} members={members} />
      </div>

      {/* Balance summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3.5">
            Saldo por fondo
          </p>
          {sources.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">Sin fondos</p>
          ) : sources.map((s) => (
            <div key={s.id} className="flex justify-between items-center mb-2">
              <span className="flex items-center gap-1.5 text-[13px] text-foreground">
                <span className="size-2 rounded-full shrink-0 inline-block" style={{ background: s.color ?? "#16A34A" }} />
                {s.name}
              </span>
              <span className={`font-bold text-[13px] ${s.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                ${s.balance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3.5">
            Saldo por miembro
          </p>
          {members.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/60">Sin miembros</p>
          ) : members.map((m) => (
            <div key={m.id} className="flex justify-between items-center mb-2">
              <span className="text-[13px] text-foreground">{m.name}</span>
              <span className={`font-bold text-[13px] ${m.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                ${m.balance.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfers table with tabs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab("fund")} className={tabCls(activeTab === "fund")}>
            <ArrowLeftRight size={14} /> Fondos
            <span className="ml-1 text-[11px] text-muted-foreground">({fundRows.length})</span>
          </button>
          <button onClick={() => setActiveTab("member")} className={tabCls(activeTab === "member")}>
            <Users size={14} /> Miembros
            <span className="ml-1 text-[11px] text-muted-foreground">({memberRows.length})</span>
          </button>
        </div>

        {activeTab === "fund" ? (
          <FundTransferTable key="fund" rows={fundRows} srcMap={srcMap} usrMap={usrMap} />
        ) : (
          <MemberTransferTable key="member" rows={memberRows} usrMap={usrMap} />
        )}
      </div>
    </div>
  );
}
