import { db, expenseTypes, expenseTypeAmounts } from "@repo/db";
import { sql } from "drizzle-orm";
import { AddTypeModal } from "./_components/AddTypeModal";
import { EditTypeModal } from "./_components/EditTypeModal";
import { DeleteTypeButton } from "./_components/DeleteTypeButton";

export default async function TypesPage() {
  const types = await db.select().from(expenseTypes).orderBy(expenseTypes.name);

  // Count usages per type
  const usageCounts = await db
    .select({
      typeId: expenseTypeAmounts.expenseTypeId,
      count: sql<string>`COUNT(*)`,
    })
    .from(expenseTypeAmounts)
    .groupBy(expenseTypeAmounts.expenseTypeId);

  const usageMap = Object.fromEntries(
    usageCounts.map((u) => [u.typeId, parseInt(u.count)])
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Tipos de Gasto</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {types.length} tipo{types.length !== 1 ? "s" : ""} registrado{types.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTypeModal />
      </div>

      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        {types.length === 0 ? (
          <p style={{ padding: "48px 32px", color: "#94A3B8", textAlign: "center" }}>
            No hay tipos de gasto creados aún. Crea el primero para clasificar tus gastos.
          </p>
        ) : (
          types.map((t, idx) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: idx < types.length - 1 ? "1px solid #F1F5F9" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  background: t.color ?? "#7C3AED", flexShrink: 0,
                }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: "14px" }}>{t.name}</p>
                  <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                    Usado en {usageMap[t.id] ?? 0} gasto{(usageMap[t.id] ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "12px", padding: "2px 10px", borderRadius: "99px",
                  background: `${t.color ?? "#7C3AED"}22`,
                  color: t.color ?? "#7C3AED",
                  fontWeight: 600,
                }}>
                  {t.name}
                </span>
                <EditTypeModal type={{ id: t.id, name: t.name, color: t.color }} />
                <DeleteTypeButton id={t.id} name={t.name} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
