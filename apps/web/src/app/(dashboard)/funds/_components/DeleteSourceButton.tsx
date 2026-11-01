"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui";

export function DeleteSourceButton({
  id,
  name,
  balance,
}: {
  id: string;
  name: string;
  balance: number;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const router = useRouter();

  const isLocked = Math.abs(balance) > 0.001;

  async function handleDelete() {
    setLoading(true);
    setApiError("");
    const res = await fetch(`/api/income-sources/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setApiError(data.error ?? "Error al eliminar el fondo.");
    }
  }

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled
            aria-label="No se puede eliminar — fondo con saldo"
            className="flex items-center justify-center size-8 rounded-md border-none bg-transparent text-muted-foreground/40 cursor-not-allowed"
          >
            <Lock size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          Saldo disponible: <strong>${balance.toFixed(2)}</strong>. Lleva el saldo a $0.00 para poder eliminar este fondo.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <AlertDialog onOpenChange={() => setApiError("")}>
      <AlertDialogTrigger asChild>
        <button
          aria-label="Eliminar fondo"
          className="flex items-center justify-center size-8 rounded-md border-none bg-transparent text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar fondo?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                Se desactivará el fondo <strong>&ldquo;{name}&rdquo;</strong>. Los ingresos, gastos y transferencias asociados no se eliminarán.
              </p>
              {apiError && (
                <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
