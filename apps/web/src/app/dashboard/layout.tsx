import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { DashboardShell } from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [dbUser, clerkUser] = await Promise.all([
    getOrCreateUser(userId),
    currentUser(),
  ]);

  if (!dbUser) redirect("/access-denied");

  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    dbUser.fullName ||
    "Usuario";

  const email =
    clerkUser?.emailAddresses[0]?.emailAddress || dbUser.email || "";

  return (
    <DashboardShell user={{ name, email, imageUrl: clerkUser?.imageUrl }}>
      {children}
    </DashboardShell>
  );
}
