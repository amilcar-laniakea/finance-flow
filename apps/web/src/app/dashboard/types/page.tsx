import { db, expenseTypes, expenseTypeAmounts, expenses } from "@repo/db";
import { sql, isNull, eq, or, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { AddTypeModal } from "./_components/AddTypeModal";
import { EditTypeModal } from "./_components/EditTypeModal";
import { DeleteTypeButton } from "./_components/DeleteTypeButton";

export default async function TypesPage() {
  const ctx = await getInstanceContext();
  if (!ctx || !ctx.canRead) redirect("/dashboard");

  const hid = ctx.activeHousehold.id;

  const [allTypes, usageCounts] = await Promise.all([
    db.select().from(expenseTypes)
      .where(or(isNull(expenseTypes.householdId), eq(expenseTypes.householdId, hid)))
      .orderBy(expenseTypes.name),
    db.select({ typeId: expenseTypeAmounts.expenseTypeId, count: sql<string>`COUNT(*)` })
      .from(expenseTypeAmounts)
      .innerJoin(expenses, and(eq(expenseTypeAmounts.expenseId, expenses.id), isNull(expenses.deletedAt), eq(expenses.householdId, hid)))
      .groupBy(expenseTypeAmounts.expenseTypeId),
  ]);

  const usageMap = Object.fromEntries(usageCounts.map((u) => [u.typeId, parseInt(u.count)]));

  const personalTypes = allTypes.filter((t) => t.householdId === hid);
  const globalTypes = allTypes.filter((t) => t.householdId === null);

  const isPersonal = ctx.activeHousehold.isPersonal;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Tipos de Gasto</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {allTypes.length} tipo{allTypes.length !== 1 ? "s" : ""} disponible{allTypes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddTypeModal />
      </div>

      {/* Personal / instance types — shown first when in personal instance, or the only section in main */}
      {isPersonal && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Mis tipos personales</h2>
          <div className="bg-card border border-border rounded-lg">
            {personalTypes.length === 0 ? (
              <p className="px-8 py-10 text-muted-foreground text-center text-sm">
                No se ha configurado ninguno todavía. Usa el botón para crear tu primer tipo.
              </p>
            ) : (
              <TypeList types={personalTypes} usageMap={usageMap} editable />
            )}
          </div>
        </section>
      )}

      {/* Global types */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">
          {isPersonal ? "Tipos globales (instancia principal)" : "Tipos de gasto"}
        </h2>
        <div className="bg-card border border-border rounded-lg">
          {globalTypes.length === 0 ? (
            <p className="px-8 py-10 text-muted-foreground text-center text-sm">
              No hay tipos globales aún.
            </p>
          ) : (
            <TypeList types={globalTypes} usageMap={usageMap} editable={!isPersonal} />
          )}
        </div>
      </section>
    </div>
  );
}

function TypeList({
  types,
  usageMap,
  editable,
}: {
  types: { id: string; name: string; color: string | null }[];
  usageMap: Record<string, number>;
  editable: boolean;
}) {
  return (
    <>
      {types.map((t, idx) => (
        <div
          key={t.id}
          className={`flex items-center justify-between gap-3 px-5 py-3.5 ${idx < types.length - 1 ? "border-b border-border/60" : ""}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="hidden md:block size-3 rounded-full shrink-0" style={{ background: t.color ?? "#7C3AED" }} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
              <p className="hidden md:block font-semibold text-sm text-foreground whitespace-nowrap">{t.name}</p>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted font-medium whitespace-nowrap" style={{ color: t.color ?? "#7C3AED" }}>
                <span className="size-1.5 rounded-full shrink-0" style={{ background: t.color ?? "#7C3AED" }} />
                {t.name}
              </span>
              <span className="hidden md:inline text-xs text-muted-foreground whitespace-nowrap">
                Usado en {usageMap[t.id] ?? 0} gasto{(usageMap[t.id] ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {editable ? (
              <>
                <EditTypeModal type={{ id: t.id, name: t.name, color: t.color }} />
                <DeleteTypeButton id={t.id} name={t.name} />
              </>
            ) : (
              <span className="text-xs text-muted-foreground px-2">Solo lectura</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
