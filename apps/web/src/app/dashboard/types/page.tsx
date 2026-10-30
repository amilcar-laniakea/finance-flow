import { db, expenseTypes, expenseTypeAmounts } from "@repo/db";
import { sql } from "drizzle-orm";
import { AddTypeModal } from "./_components/AddTypeModal";
import { EditTypeModal } from "./_components/EditTypeModal";
import { DeleteTypeButton } from "./_components/DeleteTypeButton";

export default async function TypesPage() {
  const types = await db.select().from(expenseTypes).orderBy(expenseTypes.name);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tipos de Gasto</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {types.length} tipo{types.length !== 1 ? "s" : ""} registrado{types.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTypeModal />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {types.length === 0 ? (
          <p className="px-8 py-12 text-muted-foreground text-center">
            No hay tipos de gasto creados aún. Crea el primero para clasificar tus gastos.
          </p>
        ) : (
          types.map((t, idx) => (
            <div
              key={t.id}
              className={`flex items-center justify-between px-5 py-3.5 ${idx < types.length - 1 ? "border-b border-border/60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ background: t.color ?? "#7C3AED" }}
                />
                <div>
                  <p className="font-semibold text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Usado en {usageMap[t.id] ?? 0} gasto{(usageMap[t.id] ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ background: `${t.color ?? "#7C3AED"}22`, color: t.color ?? "#7C3AED" }}
                >
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
