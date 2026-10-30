"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@repo/ui";
import { AddInstanceTransferModal } from "./AddInstanceTransferModal";

type Source = { id: string; name: string; color: string | null; balanceUsd?: number };
type OtherHousehold = { id: string; name: string; isMain: boolean; sources: Source[] };


type TransferRow = {
  id: string;
  fromSourceId: string | null;
  toSourceId: string | null;
  fromSourceName: string | null;
  fromSourceColor: string | null;
  toSourceName: string | null;
  toSourceColor: string | null;
  fromHouseholdName: string | null;
  toHouseholdName: string | null;
  amountUsd: string;
  description: string | null;
  period: string | null;
};

const PAGE_SIZES = [10, 20, 50] as const;

export function InstanceTransfersClient({
  currentSources,
  currentHouseholdId,
  currentHouseholdName,
  otherHouseholds,
  rows,
}: {
  currentSources: Source[];
  currentHouseholdId: string;
  currentHouseholdName: string;
  otherHouseholds: OtherHousehold[];
  rows: TransferRow[];
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const total = rows.length;
  const pageCount = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const visible = pageSize === "all" ? rows : rows.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta transferencia?")) return;
    setDeletingId(id);
    await fetch(`/api/fund-transfers/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entre Instancias</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {total} transferencia{total !== 1 ? "s" : ""} cross-instancia
          </p>
        </div>
        <AddInstanceTransferModal
          currentSources={currentSources}
          currentHouseholdId={currentHouseholdId}
          currentHouseholdName={currentHouseholdName}
          otherHouseholds={otherHouseholds}
        />
      </div>

      {/* Table card */}
      <div className="rounded-lg border bg-card">
        {rows.length === 0 ? (
          <p className="px-8 py-12 text-center text-sm text-muted-foreground">
            No hay transferencias entre instancias todavía.
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="block md:hidden">
              {visible.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 border-b p-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">${parseFloat(r.amountUsd).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{r.fromHouseholdName ?? "—"}</span>
                    <span>·</span>
                    <span>{r.fromSourceName ?? "—"}</span>
                    <ArrowRight size={11} className="mx-0.5 shrink-0" />
                    <span className="font-medium text-foreground">{r.toHouseholdName ?? "—"}</span>
                    <span>·</span>
                    <span>{r.toSourceName ?? "—"}</span>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 self-end text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 text-left font-medium">Origen</th>
                    <th className="px-5 py-3 text-left font-medium">Destino</th>
                    <th className="px-5 py-3 text-left font-medium">Descripción</th>
                    <th className="px-5 py-3 text-right font-medium">Monto</th>
                    <th className="px-5 py-3 text-right font-medium">Fecha</th>
                    <th className="px-3 py-3 text-center font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, idx) => (
                    <tr key={r.id} className={idx < visible.length - 1 ? "border-b border-border/60" : ""}>
                      <td className="px-5 py-3">
                        <div className="text-xs font-semibold text-foreground">{r.fromHouseholdName ?? "—"}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {r.fromSourceColor && (
                            <span className="inline-block size-1.5 rounded-full shrink-0" style={{ background: r.fromSourceColor }} />
                          )}
                          {r.fromSourceName ?? "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs font-semibold text-foreground">{r.toHouseholdName ?? "—"}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          {r.toSourceColor && (
                            <span className="inline-block size-1.5 rounded-full shrink-0" style={{ background: r.toSourceColor }} />
                          )}
                          {r.toSourceName ?? "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[180px] truncate">
                        {r.description ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                        ${parseFloat(r.amountUsd).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {r.period ? new Date(r.period).toLocaleDateString("es-VE") : "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Filas:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.target.value === "all" ? "all" : Number(e.target.value)); setPage(1); }}
                  className="rounded border border-input bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="all">Todos</option>
                </select>
                <span>{total} total</span>
              </div>
              {pageSize !== "all" && pageCount > 1 && (
                <div className="flex items-center gap-1 text-sm">
                  <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</Button>
                  <span className="px-2 text-xs text-muted-foreground">{page} / {pageCount}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === pageCount}>›</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(pageCount)} disabled={page === pageCount}>»</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
