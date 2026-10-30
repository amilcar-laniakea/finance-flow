import { db, users, incomeDistributions, expenses, incomes, incomeSources, fundTransfers } from "@repo/db";
import { eq, isNull, sql, and, or, inArray, desc } from "drizzle-orm";
import { RegisterUserModal } from "./_components/RegisterUserModal";
import { MemberDetailModal } from "./_components/MemberDetailModal";
import { EditUserModal } from "./_components/EditUserModal";
import { DeleteUserButton } from "./_components/DeleteUserButton";
import type { MemberExpense, MemberDistribution, MemberTransfer } from "./_components/MemberDetailModal";

const roleLabel: Record<string, string> = {
  owner: "Propietario",
  member: "Miembro",
  viewer: "Solo lectura",
};

export default async function MembersPage() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      clerkId: users.clerkId,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  const userIds = rows.map((r) => r.id);

  const memberBalances = await Promise.all(
    rows.map(async (u) => {
      const [dist] = await db
        .select({ total: sql<string>`COALESCE(SUM(${incomeDistributions.amountUsd}), 0)` })
        .from(incomeDistributions)
        .innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt)))
        .where(eq(incomeDistributions.memberId, u.id));

      const [exp] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(expenses)
        .where(and(eq(expenses.memberId, u.id), isNull(expenses.deletedAt)));

      const [tin] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.toMemberId, u.id), isNull(fundTransfers.deletedAt)));
      const [tout] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(fundTransfers)
        .where(and(eq(fundTransfers.fromMemberId, u.id), isNull(fundTransfers.deletedAt)));

      const totalReceived = parseFloat(dist?.total ?? "0");
      const totalSpent = parseFloat(exp?.total ?? "0");
      const transfersIn = parseFloat(tin?.total ?? "0");
      const transfersOut = parseFloat(tout?.total ?? "0");
      const balance = totalReceived - totalSpent + transfersIn - transfersOut;

      return { userId: u.id, fullName: u.fullName, totalReceived, totalSpent, balance };
    })
  );

  const allMemberExpenses = userIds.length > 0
    ? await db
        .select({
          id: expenses.id,
          memberId: expenses.memberId,
          description: expenses.description,
          merchant: expenses.merchant,
          amountUsd: expenses.amountUsd,
          amountBs: expenses.amountBs,
          occurredAt: expenses.occurredAt,
        })
        .from(expenses)
        .where(and(inArray(expenses.memberId, userIds), isNull(expenses.deletedAt)))
        .orderBy(desc(expenses.occurredAt))
    : [];

  const allDistributions = userIds.length > 0
    ? await db
        .select({
          id: incomeDistributions.id,
          memberId: incomeDistributions.memberId,
          amountUsd: incomeDistributions.amountUsd,
          incomeDescription: incomes.description,
          incomePeriod: incomes.period,
          sourceName: incomeSources.name,
        })
        .from(incomeDistributions)
        .innerJoin(incomes, and(eq(incomeDistributions.incomeId, incomes.id), isNull(incomes.deletedAt)))
        .leftJoin(incomeSources, eq(incomes.sourceId, incomeSources.id))
        .where(inArray(incomeDistributions.memberId, userIds))
        .orderBy(desc(incomes.period))
    : [];

  const allMemberTransfers = userIds.length > 0
    ? await db
        .select({
          id: fundTransfers.id,
          fromMemberId: fundTransfers.fromMemberId,
          toMemberId: fundTransfers.toMemberId,
          amountUsd: fundTransfers.amountUsd,
          description: fundTransfers.description,
          period: fundTransfers.period,
        })
        .from(fundTransfers)
        .where(and(
          isNull(fundTransfers.deletedAt),
          or(
            inArray(fundTransfers.fromMemberId, userIds),
            inArray(fundTransfers.toMemberId, userIds),
          ),
        ))
        .orderBy(desc(fundTransfers.period))
    : [];

  const userNameMap = Object.fromEntries(rows.map((r) => [r.id, r.fullName ?? r.email]));

  const expensesByMember = new Map<string, MemberExpense[]>();
  for (const e of allMemberExpenses) {
    if (!e.memberId) continue;
    if (!expensesByMember.has(e.memberId)) expensesByMember.set(e.memberId, []);
    expensesByMember.get(e.memberId)!.push({
      id: e.id,
      description: e.description,
      merchant: e.merchant,
      amountUsd: e.amountUsd,
      amountBs: e.amountBs,
      occurredAt: e.occurredAt,
    });
  }

  const distributionsByMember = new Map<string, MemberDistribution[]>();
  for (const d of allDistributions) {
    if (!d.memberId) continue;
    if (!distributionsByMember.has(d.memberId)) distributionsByMember.set(d.memberId, []);
    distributionsByMember.get(d.memberId)!.push({
      id: d.id,
      amountUsd: d.amountUsd,
      incomeDescription: d.incomeDescription,
      incomePeriod: d.incomePeriod,
      sourceName: d.sourceName,
    });
  }

  const transfersByMember = new Map<string, MemberTransfer[]>();
  for (const t of allMemberTransfers) {
    const entry = (id: string, direction: "in" | "out", counterpartId: string | null) => {
      if (!transfersByMember.has(id)) transfersByMember.set(id, []);
      transfersByMember.get(id)!.push({
        id: t.id,
        direction,
        amountUsd: t.amountUsd,
        description: t.description,
        period: t.period,
        counterpartName: counterpartId ? (userNameMap[counterpartId] ?? null) : null,
      });
    };
    if (t.fromMemberId && userIds.includes(t.fromMemberId)) entry(t.fromMemberId, "out", t.toMemberId);
    if (t.toMemberId && userIds.includes(t.toMemberId)) entry(t.toMemberId, "in", t.fromMemberId);
  }

  const balanceMap = Object.fromEntries(memberBalances.map((b) => [b.userId, b]));
  const active = rows.filter((u) => u.clerkId);
  const pending = rows.filter((u) => !u.clerkId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {active.length} activo{active.length !== 1 ? "s" : ""} · {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
          </p>
        </div>
        <RegisterUserModal />
      </div>

      {/* Balance cards */}
      {memberBalances.some((m) => m.totalReceived > 0 || m.totalSpent > 0) && (
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-3">
            Saldo por usuario
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {memberBalances.map((m) => (
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
                  expenses={expensesByMember.get(m.userId) ?? []}
                  distributions={distributionsByMember.get(m.userId) ?? []}
                  transfers={transfersByMember.get(m.userId) ?? []}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {active.length > 0 && (
          <Section title="Activos" count={active.length}>
            {active.map((u) => (
              <UserRow key={u.id} user={u} memberBalance={balanceMap} />
            ))}
          </Section>
        )}

        {pending.length > 0 && (
          <Section title="Pendientes — aún no se han registrado en la plataforma" count={pending.length}>
            {pending.map((u) => (
              <UserRow key={u.id} user={u} memberBalance={balanceMap} />
            ))}
          </Section>
        )}

        {rows.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            No hay usuarios registrados aún.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function UserRow({
  user,
  memberBalance,
}: {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string | null;
    clerkId: string | null;
    createdAt: Date | null;
  };
  memberBalance: Record<string, { balance: number; totalReceived: number; totalSpent: number; fullName: string | null }>;
}) {
  const isActive = !!user.clerkId;
  const matchedMember = memberBalance[user.id];

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          isActive
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            : "bg-muted text-muted-foreground"
        }`}>
          {(user.fullName ?? user.email)[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground mb-0.5">{user.fullName ?? "—"}</p>
          <p className="text-[13px] text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          {roleLabel[user.role ?? "member"] ?? user.role}
        </span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
          isActive
            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
            : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
        }`}>
          {isActive ? "✓ Activo" : "⏳ Pendiente"}
        </span>
        {matchedMember && (
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
            matchedMember.balance >= 0
              ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
          }`}>
            {matchedMember.balance >= 0 ? "+" : ""}${matchedMember.balance.toFixed(2)}
          </span>
        )}
        <div className="flex items-center gap-0.5 ml-1">
          <EditUserModal user={{ id: user.id, fullName: user.fullName, email: user.email, role: user.role }} />
          <DeleteUserButton id={user.id} name={user.fullName ?? user.email} />
        </div>
      </div>
    </div>
  );
}
