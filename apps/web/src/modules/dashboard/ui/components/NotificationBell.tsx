"use client";

import { useEffect, useState } from "react";
import { Bell, ArrowLeftRight, X, CheckCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "justo ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (e) => {
      try {
        setItems(JSON.parse(e.data) as Notification[]);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  async function dismissAll() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setItems([]);
  }

  const count = items.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Notificaciones"
        >
          <Bell size={17} strokeWidth={2} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notificaciones</p>
          {count > 0 && (
            <button
              onClick={dismissAll}
              className="flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck size={13} />
              Marcar todo
            </button>
          )}
        </div>

        {/* Items */}
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center text-muted-foreground">
              <Bell size={20} strokeWidth={1.5} className="opacity-40" />
              <p className="text-sm">Sin notificaciones nuevas</p>
            </div>
          ) : (
            items.map((n, idx) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 ${idx < items.length - 1 ? "border-b border-border/60" : ""}`}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <ArrowLeftRight size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-foreground"
                  aria-label="Marcar como leída"
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
