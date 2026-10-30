"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Scale, ChevronDown, ChevronUp, X, KeyRound } from "lucide-react";

type LiveData = {
  spot: number;
  funding: number;
  total: number;
  appTotal: number;
  discrepancy: number;
  status: string;
  fetchedAt: string;
  error?: string | null;
  fundingNote?: string | null;
};

type AuditRow = {
  id: string;
  binanceSpotUsdt: string;
  binanceFundUsdt: string;
  binanceTotalUsdt: string;
  appTotalUsdt: string;
  discrepancyUsd: string;
  status: string;
  triggeredBy: string;
  createdAt: string | null;
};

type CorrectionRow = {
  id: string;
  auditId: string;
  fundId: string;
  memberId: string;
  adjustmentUsd: string;
  tag: string | null;
  notes: string | null;
  status: string;
  isAutomatic: string;
  correctedAt: string | null;
  fundName: string | null;
  memberName: string | null;
};

type Fund = { id: string; name: string; color: string | null };
type Member = { id: string; name: string | null; email: string | null };

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  green:  { bg: "bg-green-50 dark:bg-green-950/40",  text: "text-green-700 dark:text-green-400",  border: "border-green-200 dark:border-green-800",  dot: "bg-green-500" },
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-500" },
  orange: { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  red:    { bg: "bg-red-50 dark:bg-red-950/40",       text: "text-red-700 dark:text-red-400",       border: "border-red-200 dark:border-red-800",       dot: "bg-red-500" },
};

const STATUS_LABEL: Record<string, string> = {
  green: "Sin discrepancia", yellow: "Discrepancia leve", orange: "Discrepancia moderada", red: "Discrepancia crítica",
};

function statusConfirmText(status: string, discrepancy: number): string {
  const abs = Math.abs(discrepancy).toFixed(2);
  if (status === "green") {
    if (discrepancy < 0) return `Binance tiene $${abs} más que la app — saldo a favor. Se registrará la auditoría sin corrección.`;
    return `Diferencia mínima de $${abs} (< $3). Se registrará la auditoría sin corrección.`;
  }
  if (status === "yellow") return `Discrepancia leve de $${abs} ($3–$4.99). Se registrará la auditoría y se aplicará una corrección automática en WITI-CENCOSUD para amilcar.laniakea@gmail.com.`;
  if (status === "orange") return `Discrepancia moderada de $${abs} ($5–$19.99). Se registrará la auditoría. Configura la corrección abajo antes de sincronizar.`;
  return `Discrepancia crítica de $${abs} (≥ $20). Se registrará la auditoría. Configura la corrección abajo antes de sincronizar.`;
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR["red"]!;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`inline-block size-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function AuditClient({
  audits: initialAudits,
  corrections: initialCorrections,
  activeFunds,
  members,
  binanceEnabled,
}: {
  audits: AuditRow[];
  corrections: CorrectionRow[];
  activeFunds: Fund[];
  members: Member[];
  binanceEnabled: boolean;
}) {
  const router = useRouter();
  const [audits, setAudits] = useState(initialAudits);
  const [corrections, setCorrections] = useState(initialCorrections);

  // Live Binance fetch
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const fetchLive = useCallback(async () => {
    setLiveLoading(true);
    setShowAnalysis(false);
    try {
      const res = await fetch("/api/binance-audit/live");
      const data = await res.json() as LiveData;
      setLive(data);
    } catch {
      setLive({ spot: 0, funding: 0, total: 0, appTotal: 0, discrepancy: 0, status: "red", fetchedAt: new Date().toISOString(), error: "Error de red" });
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLive(); }, [fetchLive]);

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState("");
  // Inline correction form for orange/red inside the confirm dialog
  const [dialogCorrect, setDialogCorrect] = useState({ fundId: "", memberId: "", adjustmentUsd: "", tag: "", notes: "" });

  function openConfirm() {
    if (live) {
      setDialogCorrect({
        fundId: activeFunds[0]?.id ?? "",
        memberId: members[0]?.id ?? "",
        adjustmentUsd: String((-live.discrepancy).toFixed(2)),
        tag: "",
        notes: "",
      });
    }
    setRunError("");
    setShowConfirm(true);
  }

  async function handleSyncConfirmed() {
    setRunLoading(true);
    setRunError("");
    try {
      // 1. Run the audit
      const res = await fetch("/api/binance-audit", { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setRunError(d.error ?? "Error al ejecutar auditoría");
        return;
      }
      const auditData = await res.json() as { auditId?: string };

      // 2. For orange/red: apply manual correction immediately if form is filled
      const needsManualCorrect = live && (live.status === "orange" || live.status === "red");
      if (needsManualCorrect && auditData.auditId && dialogCorrect.fundId && dialogCorrect.memberId) {
        await fetch("/api/binance-audit/correct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auditId: auditData.auditId, ...dialogCorrect }),
        });
      }

      const res2 = await fetch("/api/binance-audit");
      const data = await res2.json() as { audits: AuditRow[]; corrections: CorrectionRow[] };
      setAudits(data.audits);
      setCorrections(data.corrections);
      setShowConfirm(false);
      setShowAnalysis(false);
      await fetchLive();
      router.refresh();
    } finally {
      setRunLoading(false);
    }
  }

  // Correct audit
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctForm, setCorrectForm] = useState({ fundId: "", memberId: "", adjustmentUsd: "", tag: "", notes: "" });
  const [correctLoading, setCorrectLoading] = useState(false);
  const [correctError, setCorrectError] = useState("");

  function openCorrect(audit: AuditRow) {
    const disc = parseFloat(audit.discrepancyUsd);
    setCorrectingId(audit.id);
    setCorrectForm({ fundId: activeFunds[0]?.id ?? "", memberId: members[0]?.id ?? "", adjustmentUsd: String(-disc), tag: "", notes: "" });
    setCorrectError("");
  }

  async function handleCorrect(auditId: string) {
    setCorrectLoading(true);
    setCorrectError("");
    try {
      const res = await fetch("/api/binance-audit/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, ...correctForm }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setCorrectError(d.error ?? "Error al guardar corrección");
        return;
      }
      const res2 = await fetch("/api/binance-audit");
      const data = await res2.json() as { audits: AuditRow[]; corrections: CorrectionRow[] };
      setAudits(data.audits);
      setCorrections(data.corrections);
      setCorrectingId(null);
      router.refresh();
    } finally {
      setCorrectLoading(false);
    }
  }

  const correctionsByAudit = new Map(corrections.map((c) => [c.auditId, c]));

  return (
    <div className="relative p-6 max-w-5xl mx-auto space-y-8 w-full min-w-0 overflow-hidden">
      {/* Overlay — Binance not configured */}
      {!binanceEnabled && (
        <div className="absolute inset-0 z-40 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-4 text-center px-6 py-8 max-w-sm bg-card border border-border rounded-2xl shadow-xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
              <KeyRound className="text-muted-foreground" size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Módulo no disponible</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Las variables <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">BINANCE_API_KEY</code> y{" "}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">BINANCE_API_SECRET</code> no están configuradas en este entorno.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && live && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-foreground">Confirmar sincronización</h3>
              <button onClick={() => setShowConfirm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className={`rounded-lg p-3 border ${STATUS_COLOR[live.status]?.bg ?? ""} ${STATUS_COLOR[live.status]?.border ?? "border-border"}`}>
              <StatusBadge status={live.status} />
              <p className={`mt-2 text-sm break-words ${STATUS_COLOR[live.status]?.text ?? "text-foreground"}`}>
                {statusConfirmText(live.status, live.discrepancy)}
              </p>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Binance total</span><span className="font-semibold text-foreground">${live.total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>App total</span><span className="font-semibold text-foreground">${live.appTotal.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
                <span>Diferencia</span>
                <span className={`font-bold ${Math.abs(live.discrepancy) < 1 ? "text-green-600 dark:text-green-400" : live.discrepancy > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {live.discrepancy >= 0 ? "+" : ""}${live.discrepancy.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Correction form for orange/red — configure before syncing */}
            {(live.status === "orange" || live.status === "red") && (
              <div className="border border-border rounded-lg p-3 space-y-3 bg-background/60">
                <p className="text-xs font-semibold text-foreground">Corrección manual (aplicar al sincronizar)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Fondo</label>
                    <select
                      value={dialogCorrect.fundId}
                      onChange={(e) => setDialogCorrect((f) => ({ ...f, fundId: e.target.value }))}
                      className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                    >
                      {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Miembro</label>
                    <select
                      value={dialogCorrect.memberId}
                      onChange={(e) => setDialogCorrect((f) => ({ ...f, memberId: e.target.value }))}
                      className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                    >
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Ajuste USD</label>
                    <input
                      type="number"
                      step="0.01"
                      value={dialogCorrect.adjustmentUsd}
                      onChange={(e) => setDialogCorrect((f) => ({ ...f, adjustmentUsd: e.target.value }))}
                      className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Tag</label>
                    <input
                      type="text"
                      value={dialogCorrect.tag}
                      onChange={(e) => setDialogCorrect((f) => ({ ...f, tag: e.target.value }))}
                      placeholder="ej: retiro-binance"
                      className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Notas (opcional)</label>
                  <input
                    type="text"
                    value={dialogCorrect.notes}
                    onChange={(e) => setDialogCorrect((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Descripción de la corrección"
                    className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground w-full"
                  />
                </div>
              </div>
            )}

            {runError && <p className="text-sm text-red-600 dark:text-red-400">{runError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background hover:bg-muted text-foreground text-sm cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSyncConfirmed}
                disabled={runLoading}
                className="flex-1 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer border-none transition-colors"
              >
                {runLoading ? "Sincronizando…" : "Sincronizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Scale size={22} className="text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Auditoría — Saldo Binance</h1>
      </div>

      {/* Live Binance balance card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 w-full min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Saldo en tiempo real (Binance USDT)</h2>
          <button
            onClick={fetchLive}
            disabled={liveLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 text-foreground cursor-pointer"
          >
            <RefreshCw size={12} className={liveLoading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>

        {liveLoading && !live && <p className="text-sm text-muted-foreground">Consultando Binance…</p>}
        {live?.error && <p className="text-sm text-red-600 dark:text-red-400">Error: {live.error}</p>}

        {live && !live.error && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Spot", value: live.spot },
                { label: "Funding", value: live.funding },
                { label: "Total", value: live.total, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-lg ${bold ? "font-bold text-foreground" : "font-semibold text-muted-foreground"}`}>
                    ${(value ?? 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {live.fundingNote && (
              <p className="text-[11px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1">
                ⚠ {live.fundingNote}
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Actualizado: {new Date(live.fetchedAt).toLocaleString("es-VE")}
            </p>

            {/* Analyze button */}
            <button
              onClick={() => setShowAnalysis((v) => !v)}
              disabled={liveLoading}
              className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground text-sm font-medium cursor-pointer transition-colors"
            >
              {showAnalysis ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {showAnalysis ? "Ocultar análisis" : "Analizar discrepancia con la app"}
            </button>

            {/* Analysis section */}
            {showAnalysis && (
              <div className={`rounded-xl border p-4 space-y-3 overflow-hidden min-w-0 ${STATUS_COLOR[live.status]?.bg ?? ""} ${STATUS_COLOR[live.status]?.border ?? "border-border"}`}>
                <div className="flex items-center gap-2">
                  <StatusBadge status={live.status} />
                  <span className="text-xs text-muted-foreground">resultado del análisis</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-background/60 p-3">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Binance</p>
                    <p className="text-base font-bold text-foreground">${live.total.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Spot + Funding</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3">
                    <p className="text-[11px] text-muted-foreground mb-0.5">App</p>
                    <p className="text-base font-bold text-foreground">${live.appTotal.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Suma de fondos</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Diferencia</p>
                    <p className={`text-base font-bold ${Math.abs(live.discrepancy) < 1 ? "text-green-600 dark:text-green-400" : live.discrepancy > 0 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {live.discrepancy >= 0 ? "+" : ""}${live.discrepancy.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">App − Binance</p>
                  </div>
                </div>

                <p className={`text-sm min-w-0 break-words ${STATUS_COLOR[live.status]?.text ?? "text-foreground"}`}>
                  {statusConfirmText(live.status, live.discrepancy)}
                </p>

                {runError && <p className="text-sm text-red-600 dark:text-red-400">{runError}</p>}

                <button
                  onClick={openConfirm}
                  disabled={runLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer border-none transition-colors"
                >
                  <RefreshCw size={14} className={runLoading ? "animate-spin" : ""} />
                  {runLoading ? "Sincronizando…" : "Sincronizar"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Audit history */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Historial de auditorías</h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin auditorías registradas.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs">
                    <th className="text-left px-4 py-2.5">Fecha</th>
                    <th className="text-right px-4 py-2.5">Spot</th>
                    <th className="text-right px-4 py-2.5">Funding</th>
                    <th className="text-right px-4 py-2.5">Total Binance</th>
                    <th className="text-right px-4 py-2.5">Total App</th>
                    <th className="text-right px-4 py-2.5">Diferencia</th>
                    <th className="text-center px-4 py-2.5">Estado</th>
                    <th className="text-center px-4 py-2.5">Origen</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => {
                    const corr = correctionsByAudit.get(a.id);
                    const disc = parseFloat(a.discrepancyUsd);
                    const isCorrectingThis = correctingId === a.id;
                    return (
                      <>
                        <tr key={a.id} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString("es-VE") : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">${parseFloat(a.binanceSpotUsdt).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">${parseFloat(a.binanceFundUsdt).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-foreground">${parseFloat(a.binanceTotalUsdt).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-foreground">${parseFloat(a.appTotalUsdt).toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${disc > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {disc >= 0 ? "+" : ""}${disc.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-center"><StatusBadge status={a.status} /></td>
                          <td className="px-4 py-2.5 text-center text-[11px] text-muted-foreground capitalize">{a.triggeredBy}</td>
                          <td className="px-3 py-2.5 text-center">
                            {corr ? (
                              <span className="text-[11px] text-muted-foreground">Corregido</span>
                            ) : (
                              <button
                                onClick={() => isCorrectingThis ? setCorrectingId(null) : openCorrect(a)}
                                className="text-[11px] px-2 py-1 rounded border border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-colors flex items-center gap-0.5"
                              >
                                {isCorrectingThis ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                Corregir
                              </button>
                            )}
                          </td>
                        </tr>
                        {isCorrectingThis && !corr && (
                          <tr key={`${a.id}-form`} className="border-b border-border/60 bg-muted/20">
                            <td colSpan={9} className="px-4 py-4">
                              <div className="flex flex-wrap gap-3 items-end">
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-medium text-foreground">Fondo</label>
                                  <select
                                    value={correctForm.fundId}
                                    onChange={(e) => setCorrectForm((f) => ({ ...f, fundId: e.target.value }))}
                                    className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                                  >
                                    {activeFunds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-medium text-foreground">Miembro</label>
                                  <select
                                    value={correctForm.memberId}
                                    onChange={(e) => setCorrectForm((f) => ({ ...f, memberId: e.target.value }))}
                                    className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                                  >
                                    {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-medium text-foreground">Ajuste USD</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={correctForm.adjustmentUsd}
                                    onChange={(e) => setCorrectForm((f) => ({ ...f, adjustmentUsd: e.target.value }))}
                                    className="h-8 w-28 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-xs font-medium text-foreground">Tag</label>
                                  <input
                                    type="text"
                                    value={correctForm.tag}
                                    onChange={(e) => setCorrectForm((f) => ({ ...f, tag: e.target.value }))}
                                    placeholder="ej: movimiento-binance"
                                    className="h-8 w-36 px-2 rounded border border-border bg-background text-[13px] text-foreground"
                                  />
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                  <label className="text-xs font-medium text-foreground">Notas</label>
                                  <input
                                    type="text"
                                    value={correctForm.notes}
                                    onChange={(e) => setCorrectForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="Opcional"
                                    className="h-8 px-2 rounded border border-border bg-background text-[13px] text-foreground w-full"
                                  />
                                </div>
                                <button
                                  onClick={() => handleCorrect(a.id)}
                                  disabled={correctLoading || !correctForm.fundId || !correctForm.memberId}
                                  className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer border-none transition-colors"
                                >
                                  {correctLoading ? "Guardando…" : "Aplicar corrección"}
                                </button>
                                {correctError && <p className="text-xs text-red-600 dark:text-red-400">{correctError}</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                        {corr && (
                          <tr key={`${a.id}-corr`} className="border-b border-border/60 bg-green-50/30 dark:bg-green-950/10">
                            <td colSpan={9} className="px-4 py-2 text-xs text-muted-foreground">
                              <span className="text-green-600 dark:text-green-400 font-medium mr-2">✓ Corrección{corr.isAutomatic === "true" ? " automática" : " manual"}:</span>
                              {corr.fundName} · {corr.memberName} · ${parseFloat(corr.adjustmentUsd).toFixed(2)}
                              {corr.tag && <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{corr.tag}</span>}
                              {corr.notes && <span className="ml-2 italic">{corr.notes}</span>}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Corrections history */}
      {corrections.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Historial de correcciones</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs">
                    <th className="text-left px-4 py-2.5">Fecha</th>
                    <th className="text-left px-4 py-2.5">Fondo</th>
                    <th className="text-left px-4 py-2.5">Miembro</th>
                    <th className="text-right px-4 py-2.5">Ajuste</th>
                    <th className="text-left px-4 py-2.5">Tag</th>
                    <th className="text-center px-4 py-2.5">Estado</th>
                    <th className="text-center px-4 py-2.5">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr key={c.id} className="border-b border-border/60">
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                        {c.correctedAt ? new Date(c.correctedAt).toLocaleString("es-VE") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{c.fundName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-foreground">{c.memberName ?? "—"}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${parseFloat(c.adjustmentUsd) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {parseFloat(c.adjustmentUsd) >= 0 ? "+" : ""}${parseFloat(c.adjustmentUsd).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.tag && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">{c.tag}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                        {c.isAutomatic === "true" ? "Auto" : "Manual"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
