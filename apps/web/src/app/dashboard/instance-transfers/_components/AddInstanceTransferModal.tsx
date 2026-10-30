"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui";
import { QuickAddSourceModal } from "./QuickAddSourceModal";

type Source = { id: string; name: string; color: string | null; balanceUsd?: number };
type OtherHousehold = { id: string; name: string; isMain: boolean; sources: Source[] };

export function AddInstanceTransferModal({
  currentSources: initialSources,
  otherHouseholds,
  currentHouseholdId,
  currentHouseholdName,
}: {
  currentSources: Source[];
  otherHouseholds: OtherHousehold[];
  currentHouseholdId: string;
  currentHouseholdName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [localSources, setLocalSources] = useState<Source[]>(initialSources);

  const [fromSourceId, setFromSourceId] = useState("");
  const [toHouseholdId, setToHouseholdId] = useState("");
  const [toSourceId, setToSourceId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 10));

  const router = useRouter();

  const selectedDestHousehold = otherHouseholds.find((h) => h.id === toHouseholdId);
  const fromSource = localSources.find((s) => s.id === fromSourceId);
  const toSource = selectedDestHousehold?.sources.find((s) => s.id === toSourceId);

  function handleHouseholdChange(id: string) {
    setToHouseholdId(id);
    setToSourceId("");
  }

  function handleClose() {
    setOpen(false);
    setFromSourceId("");
    setToHouseholdId("");
    setToSourceId("");
    setAmountUsd("");
    setDescription("");
    setPeriod(new Date().toISOString().slice(0, 10));
    setError("");
  }

  function handleSourceCreated(source: Source) {
    setLocalSources((prev) => [...prev, source]);
    setFromSourceId(source.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromSourceId || !toSourceId || !amountUsd) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);
    setLoading(true);
    setError("");

    const res = await fetch("/api/fund-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transferType: "cross-instance",
        fromSourceId,
        toSourceId,
        amountUsd,
        description: description || undefined,
        period,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al crear la transferencia.");
      return;
    }

    handleClose();
    router.refresh();
  }

  const canSubmit = !!fromSourceId && !!toSourceId && !!amountUsd && !loading;

  const originLabel = fromSource
    ? `${currentHouseholdName ?? "Esta instancia"} · ${fromSource.name}`
    : "—";
  const destLabel = toSource && selectedDestHousehold
    ? `${selectedDestHousehold.isMain ? "Principal" : selectedDestHousehold.name} · ${toSource.name}`
    : "—";

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nueva transferencia</Button>

      {/* Quick-add source modal */}
      <QuickAddSourceModal
        open={showAddSource}
        onClose={() => setShowAddSource(false)}
        onCreated={handleSourceCreated}
        householdId={currentHouseholdId}
      />

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar transferencia?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  Los fondos serán transferidos de forma permanente:
                </p>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Origen</span>
                    <span className="font-medium text-foreground">{originLabel}</span>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Destino</span>
                    <span className="font-medium text-foreground">{destLabel}</span>
                  </div>
                </div>
                <p className="text-center text-lg font-bold text-foreground">
                  ${parseFloat(amountUsd || "0").toFixed(2)} USD
                </p>
                <p className="text-sm text-muted-foreground">
                  ¿Estás seguro de que deseas continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer form dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Transferencia entre instancias</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Source (origin) + quick-add button */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Fondo origen *</Label>
                <button
                  type="button"
                  onClick={() => setShowAddSource(true)}
                  className="flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Agregar nuevo fondo"
                >
                  <Plus size={12} />
                  Nuevo fondo
                </button>
              </div>
              <Select value={fromSourceId} onValueChange={setFromSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="— Seleccionar fondo —" />
                </SelectTrigger>
                <SelectContent>
                  {localSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        {s.color && (
                          <span className="inline-block size-2 rounded-full shrink-0" style={{ background: s.color }} />
                        )}
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination household */}
            <div className="flex flex-col gap-1.5">
              <Label>Instancia destino *</Label>
              <Select value={toHouseholdId} onValueChange={handleHouseholdChange}>
                <SelectTrigger>
                  <SelectValue placeholder="— Seleccionar instancia —" />
                </SelectTrigger>
                <SelectContent>
                  {otherHouseholds.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.isMain ? "Principal" : h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination source */}
            {toHouseholdId && (
              <div className="flex flex-col gap-1.5">
                <Label>Fondo destino *</Label>
                {selectedDestHousehold && selectedDestHousehold.sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esta instancia no tiene fondos activos.</p>
                ) : (
                  <Select value={toSourceId} onValueChange={setToSourceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="— Seleccionar fondo —" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDestHousehold?.sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            {s.color && (
                              <span className="inline-block size-2 rounded-full shrink-0" style={{ background: s.color }} />
                            )}
                            <span>{s.name}</span>
                            {s.balanceUsd !== undefined && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                (${s.balanceUsd.toFixed(2)})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Monto USD *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Motivo de la transferencia"
              />
            </div>

            {/* Period */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period">Fecha *</Label>
              <Input
                id="period"
                type="date"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={!canSubmit}>
                {loading ? "Enviando..." : "Transferir"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
