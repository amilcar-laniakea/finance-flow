"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { RoleManagementTable } from "./RoleManagementTable";
import { InstanceActivationPanel } from "./InstanceActivationPanel";
import { CrossInstanceTransferModal } from "./CrossInstanceTransferModal";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
  personalHouseholdId: string | null;
  clerkId: string | null;
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

interface AdminPageClientProps {
  users: User[];
  households: Household[];
  mainSources: Source[];
  mainHouseholdId: string | null;
}

export function AdminPageClient({ users, households, mainSources, mainHouseholdId }: AdminPageClientProps) {
  const usersWithInstance = users.filter((u) => u.personalHouseholdId !== null);

  return (
    <Tabs defaultValue="roles">
      <TabsList className="mb-6">
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="instancias">Instancias</TabsTrigger>
        <TabsTrigger value="transferencias">Transferencias</TabsTrigger>
      </TabsList>

      <TabsContent value="roles">
        <RoleManagementTable users={users} />
      </TabsContent>

      <TabsContent value="instancias">
        <InstanceActivationPanel users={users} />
      </TabsContent>

      <TabsContent value="transferencias">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Transfiere fondos desde la instancia principal hacia la instancia personal de un usuario, o viceversa.
          </p>
          {mainHouseholdId && mainSources.length > 0 && usersWithInstance.length > 0 ? (
            <CrossInstanceTransferModal
              users={usersWithInstance}
              households={households}
              mainSources={mainSources}
              mainHouseholdId={mainHouseholdId}
            />
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
              {mainSources.length === 0
                ? "No hay fuentes de ingreso en la instancia principal."
                : "Ningún usuario tiene una instancia personal activa aún."}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
