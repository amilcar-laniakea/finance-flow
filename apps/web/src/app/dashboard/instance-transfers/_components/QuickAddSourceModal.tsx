"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Button, Input, Label,
} from "@repo/ui";

type CreatedSource = { id: string; name: string; color: string | null };

export function QuickAddSourceModal({
  open,
  onClose,
  onCreated,
  householdId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (source: CreatedSource) => void;
  householdId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#16A34A");

  function handleClose() {
    setName("");
    setDescription("");
    setColor("#16A34A");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/income-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, color, householdId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Error al crear el fondo.");
      return;
    }

    const created = await res.json() as CreatedSource;
    onCreated({ id: created.id, name: created.name, color: created.color });
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Nueva fuente de ingreso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qs-name">Nombre *</Label>
            <Input
              id="qs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Salario, Freelance..."
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qs-desc">Descripción</Label>
            <Input
              id="qs-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qs-color">Color</Label>
            <input
              id="qs-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-16 cursor-pointer rounded-md border border-input bg-background p-0.5"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creando..." : "Crear fondo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
