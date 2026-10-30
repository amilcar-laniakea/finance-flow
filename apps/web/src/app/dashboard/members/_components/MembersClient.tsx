"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { RegisterUserModal } from "./RegisterUserModal";
import { MemberDetailModal } from "./MemberDetailModal";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserButton } from "./DeleteUserButton";
import type { MemberExpense, MemberDistribution, MemberTransfer } from "./MemberDetailModal";

const roleLabel: Record<string, string> = {
  owner: "Propietario",
  member: "Miembro",
  viewer: "Solo lectura",
};

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
  clerkId: string | null;
};

type BalanceInfo = {
  userId: string;
  fullName: string | null;
  totalReceived: number;
  totalSpent: number;
  balance: number;
};

interface Props {
  users: User[];
  balances: BalanceInfo[];
  expensesByMember: Record<string, MemberExpense[]>;
  distributionsByMember: Record<string, MemberDistribution[]>;
  transfersByMember: Record<string, MemberTransfer[]>;
}

export function MembersClient({
  users,
  balances,
  expensesByMember,
  distributionsByMember,
  transfersByMember,
}: Props) {
  const [search, setSearch] = useState("");

  const balanceMap = useMemo(
    () => Object.fromEntries(balances.map((b) => [b.userId, b])),
    [balances],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const active = filtered.filter((u) => u.clerkId);
  const pending = filtered.filter((u) => !u.clerkId);

  const showBalances = balances.some((m) => m.totalReceived > 0 || m.totalSpent > 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {users.filter((u) => u.clerkId).length} activo{users.filter((u) => u.clerkId).length !== 1 ? "s" : ""} ·{" "}
            {users.filter((u) => !u.clerkId).length} pendiente{users.filter((u) => !u.clerkId).length !== 1 ? "s" : ""}
          </p>
        </div>
        <RegisterUserModal />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-8 pr-8 rounded-md border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Balance cards */}
      {showBalances && !search && (
        <div>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
            Saldo por usuario
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {balances.map((m) => (
              <div key={m.userId} className="bg-card border border-border rounded-lg p-4">
                <p className="font-bold text-sm mb-3 text-foreground">
                  {m.fullName ?? m.userId.slice(0, 8)}
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Recibido</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">${m.totalReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Gastado</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">${m.totalSpent.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/60 pt-1.5 mt-0.5 flex justify-between text-[13px]">
                    <span className="font-semibold text-foreground">Saldo</span>
                    <span className={`font-bold ${m.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                      {m.balance >= 0 ? "+" : ""}${m.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
                <MemberDetailModal
                  memberId={m.userId}
                  memberName={m.fullName ?? m.userId.slice(0, 8)}
                  totalReceived={m.totalReceived}
                  totalSpent={m.totalSpent}
                  balance={m.balance}
                  expenses={expensesByMember[m.userId] ?? []}
                  distributions={distributionsByMember[m.userId] ?? []}
                  transfers={transfersByMember[m.userId] ?? []}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User sections */}
      <div className="flex flex-col gap-5">
        {filtered.length === 0 && search && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Ningún usuario coincide con "{search}".
          </p>
        )}

        {active.length > 0 && (
          <UserSection title="Activos" count={active.length}>
            {active.map((u) => (
              <UserRow key={u.id} user={u} balanceMap={balanceMap} expensesByMember={expensesByMember} distributionsByMember={distributionsByMember} transfersByMember={transfersByMember} />
            ))}
          </UserSection>
        )}

        {pending.length > 0 && (
          <UserSection title="Pendientes — aún no se han registrado en la plataforma" count={pending.length}>
            {pending.map((u) => (
              <UserRow key={u.id} user={u} balanceMap={balanceMap} expensesByMember={expensesByMember} distributionsByMember={distributionsByMember} transfersByMember={transfersByMember} />
            ))}
          </UserSection>
        )}

        {users.length === 0 && (
          <p className="text-muted-foreground text-center py-12 text-sm">
            No hay usuarios registrados aún.
          </p>
        )}
      </div>
    </div>
  );
}

function UserSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
        {title} <span className="font-normal">({count})</span>
      </h2>
      <div className="bg-card border border-border rounded-lg">{children}</div>
    </div>
  );
}

function UserRow({
  user,
  balanceMap,
  expensesByMember,
  distributionsByMember,
  transfersByMember,
}: {
  user: User;
  balanceMap: Record<string, BalanceInfo>;
  expensesByMember: Record<string, MemberExpense[]>;
  distributionsByMember: Record<string, MemberDistribution[]>;
  transfersByMember: Record<string, MemberTransfer[]>;
}) {
  const isActive = !!user.clerkId;
  const mb = balanceMap[user.id];

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 last:border-b-0 min-w-0">
      {/* Avatar */}
      <div className={`size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        isActive ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
      }`}>
        {(user.fullName ?? user.email)[0]?.toUpperCase()}
      </div>

      {/* Name + email — mobile: flex-1, desktop: fixed width */}
      <div className="min-w-0 flex-1 md:flex-none md:w-52">
        <p className="font-semibold text-sm text-foreground truncate">{user.fullName ?? "—"}</p>
        <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
      </div>

      {/* Badges — desktop center */}
      <div className="hidden md:flex flex-1 items-center gap-2 flex-wrap justify-center">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
          {roleLabel[user.role ?? "member"] ?? user.role}
        </span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
          isActive
            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
            : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
        }`}>
          {isActive ? "✓ Activo" : "⏳ Pendiente"}
        </span>
        {mb && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
            mb.balance >= 0
              ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
          }`}>
            {mb.balance >= 0 ? "+" : ""}${mb.balance.toFixed(2)}
          </span>
        )}
      </div>

      {/* Actions — always right */}
      <div className="flex items-center gap-0.5 shrink-0">
        <EditUserModal user={{ id: user.id, fullName: user.fullName, email: user.email, role: user.role }} />
        <DeleteUserButton id={user.id} name={user.fullName ?? user.email} />
      </div>
    </div>
  );
}
