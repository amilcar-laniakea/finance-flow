import { db, users, incomeDistributions, expenses, incomes, incomeSources, fundTransfers } from "@repo/db";
import { eq, isNull, sql, and, inArray, desc } from "drizzle-orm";
import { RegisterUserModal } from "./_components/RegisterUserModal";
import { MemberDetailModal } from "./_components/MemberDetailModal";
import { EditUserModal } from "./_components/EditUserModal";
import { DeleteUserButton } from "./_components/DeleteUserButton";
import type { MemberExpense, MemberDistribution } from "./_components/MemberDetailModal";

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

  // Compute received / spent / balance per user
  const memberBalances = await Promise.all(
    rows.map(async (u) => {
      const [dist] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount_usd), 0)` })
        .from(incomeDistributions)
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

  // Fetch all expenses per member
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

  // Fetch all distributions per member with income + source info
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
        .innerJoin(incomes, eq(incomeDistributions.incomeId, incomes.id))
        .leftJoin(incomeSources, eq(incomes.sourceId, incomeSources.id))
        .where(inArray(incomeDistributions.memberId, userIds))
        .orderBy(desc(incomes.period))
    : [];

  // Group by memberId
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

  const balanceMap = Object.fromEntries(
    memberBalances.map((b) => [b.userId, b])
  );

  const active = rows.filter((u) => u.clerkId);
  const pending = rows.filter((u) => !u.clerkId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Usuarios</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {active.length} activo{active.length !== 1 ? "s" : ""} · {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
          </p>
        </div>
        <RegisterUserModal />
      </div>

      {/* User balance cards */}
      {memberBalances.some((m) => m.totalReceived > 0 || m.totalSpent > 0) && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Saldo por usuario
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
            {memberBalances.map((m) => (
              <div
                key={m.userId}
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  padding: "16px",
                }}
              >
                <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px", color: "#111827" }}>
                  {m.fullName ?? m.userId.slice(0, 8)}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#64748B" }}>Recibido</span>
                    <span style={{ fontWeight: 600, color: "#16A34A" }}>${m.totalReceived.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#64748B" }}>Gastado</span>
                    <span style={{ fontWeight: 600, color: "#DC2626" }}>${m.totalSpent.toFixed(2)}</span>
                  </div>
                  <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "6px", marginTop: "2px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#374151", fontWeight: 600 }}>Saldo</span>
                    <span style={{ fontWeight: 700, color: m.balance >= 0 ? "#1D4ED8" : "#DC2626" }}>
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
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
          <p style={{ color: "#94A3B8", textAlign: "center", padding: "48px 0" }}>
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
      <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
        {title}
      </h2>
      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: isActive ? "#DBEAFE" : "#F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: 700,
            color: isActive ? "#2563EB" : "#94A3B8",
            flexShrink: 0,
          }}
        >
          {(user.fullName ?? user.email)[0]?.toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px" }}>
            {user.fullName ?? "—"}
          </p>
          <p style={{ fontSize: "13px", color: "#64748B" }}>{user.email}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{
          fontSize: "12px",
          padding: "2px 10px",
          borderRadius: "99px",
          background: "#F1F5F9",
          color: "#475569",
        }}>
          {roleLabel[user.role ?? "member"] ?? user.role}
        </span>
        <span style={{
          fontSize: "12px",
          padding: "2px 10px",
          borderRadius: "99px",
          background: isActive ? "#DCFCE7" : "#FEF9C3",
          color: isActive ? "#16A34A" : "#A16207",
          fontWeight: 600,
        }}>
          {isActive ? "✓ Activo" : "⏳ Pendiente"}
        </span>
        {matchedMember && (
          <span style={{
            fontSize: "12px",
            padding: "2px 10px",
            borderRadius: "99px",
            background: matchedMember.balance >= 0 ? "#F0FDF4" : "#FEF2F2",
            color: matchedMember.balance >= 0 ? "#16A34A" : "#DC2626",
            fontWeight: 600,
          }}>
            {matchedMember.balance >= 0 ? "+" : ""}${matchedMember.balance.toFixed(2)}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
          <EditUserModal user={{ id: user.id, fullName: user.fullName, email: user.email, role: user.role }} />
          <DeleteUserButton id={user.id} name={user.fullName ?? user.email} />
        </div>
      </div>
    </div>
  );
}
