"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, ArrowLeftRight, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

function TransferTable({
  rows,
  srcMap,
  usrMap,
  type,
}: {
  rows: TransferRow[];
  srcMap: Record<string, SourceInfo>;
  usrMap: Record<string, MemberInfo>;
  type: "fund" | "member";
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

  const getName = (id: string | null) => {
    if (!id) return null;
    return type === "fund" ? (srcMap[id]?.name ?? null) : (usrMap[id]?.name ?? null);
  };

  const fromField = type === "fund" ? "fromSourceId" : "fromMemberId";
  const toField = type === "fund" ? "toSourceId" : "toMemberId";
  const fromColor = type === "fund" ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400";

  return (
    <div>
      {/* Search */}
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
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Top mirror scrollbar */}
      {needsHScroll && (
        <div ref={topScrollRef} onScroll={syncBottomFromTop} className="overflow-x-scroll overflow-y-hidden border-b border-border" style={{ height: 12 }}>
          <div style={{ width: tableInnerWidth, height: 1 }} />
        </div>
      )}

      {/* Mobile cards */}
      <div className="block md:hidden divide-y divide-border/60">
        {paginated.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">Sin transferencias.</p>
        ) : paginated.map((r) => {
          const from = getName(r[fromField]);
          const to = getName(r[toField]);
          return (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-1.5 text-[13px] mb-1.5 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${fromColor}`}>{from ?? "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">{to ?? "—"}</span>
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
          );
        })}
      </div>

      {/* Desktop table */}
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
              {paginated.map((r) => {
                const from = getName(r[fromField]);
                const to = getName(r[toField]);
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${fromColor}`}>
                        {from ?? "—"}
                      </span>
                    </td>
                    <td className="px-1 py-3 text-muted-foreground text-base">→</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
                        {to ?? "—"}
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

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-[12px]">Filas por página</span>
            <select
              value={perPage === "all" ? "all" : String(perPage)}
              onChange={(e) => { setPerPage(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}
              className="h-7 px-1.5 rounded border border-border bg-background text-foreground text-[12px] outline-none cursor-pointer"
            >
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="all">Todos</option>
            </select>
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

        <TransferTable
          key={activeTab}
          rows={activeTab === "fund" ? fundRows : memberRows}
          srcMap={srcMap}
          usrMap={usrMap}
          type={activeTab}
        />
      </div>
    </div>
  );
}
