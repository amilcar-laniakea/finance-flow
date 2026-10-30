"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { ArrowLeftRight } from "lucide-react";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  personalHouseholdId: string | null;
}

interface Household {
  id: string;
  name: string;
  isMain: boolean;
  isPersonal: boolean;
  ownerId: string | null;
}

interface Source {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  users: User[];
  households: Household[];
  mainSources: Source[];
  mainHouseholdId: string;
}

type Direction = "main-to-personal" | "personal-to-main";

export function CrossInstanceTransferModal({ users, households, mainSources, mainHouseholdId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [direction, setDirection] = useState<Direction>("main-to-personal");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const targetHouseholdId =
    direction === "main-to-personal"
      ? selectedUser?.personalHouseholdId ?? null
      : mainHouseholdId;

  const fromHouseholdId =
    direction === "main-to-personal" ? mainHouseholdId : (selectedUser?.personalHouseholdId ?? null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !selectedSourceId || !amount || !fromHouseholdId || !targetHouseholdId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cross-instance-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSourceId: selectedSourceId,
          fromHouseholdId,
          toHouseholdId: targetHouseholdId,
          amount: parseFloat(amount),
          description: description || undefined,
          period,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al transferir");
      }
      setOpen(false);
      setAmount("");
      setDescription("");
      setSelectedUserId("");
      setSelectedSourceId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowLeftRight className="size-4" />
          Nueva transferencia entre instancias
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferencia entre instancias</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Direction */}
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main-to-personal">Principal → Personal</SelectItem>
                <SelectItem value="personal-to-main">Personal → Principal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target user */}
          <div className="space-y-1.5">
            <Label>Usuario</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source fund */}
          <div className="space-y-1.5">
            <Label>Fuente de ingreso (origen)</Label>
            <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar fuente…" />
              </SelectTrigger>
              <SelectContent>
                {mainSources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ background: s.color ?? "#16A34A" }}
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Monto (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label>Período</Label>
            <Input
              type="date"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Input
              placeholder="Nota sobre la transferencia…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedUserId || !selectedSourceId || !amount}
            >
              {loading ? "Transfiriendo…" : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
