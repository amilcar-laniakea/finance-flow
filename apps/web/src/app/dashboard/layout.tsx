import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getInstanceContext } from "@/lib/getInstanceContext";
import { DashboardShell } from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [ctx, clerkUser] = await Promise.all([
    getInstanceContext(),
    currentUser(),
  ]);

  if (!ctx) redirect("/access-denied");

  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    ctx.activeHousehold.name ||
    "Usuario";

  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  return (
    <DashboardShell
      user={{ name, email, imageUrl: clerkUser?.imageUrl ?? undefined }}
      instanceCtx={ctx.serialized}
    >
      {children}
    </DashboardShell>
  );
}
