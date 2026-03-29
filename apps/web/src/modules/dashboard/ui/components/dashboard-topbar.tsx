import { GeneratedAvatar } from "@/components/generated-avatar";
import { Separator, SidebarTrigger } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  email: string;
  imageUrl?: string;
}

function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <ChevronLeft size={14} strokeWidth={2.5} />
      Volver
    </button>
  );
}

export const DashbardTopbar = ({ user }: { user: UserData }) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Left */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-1 data-[orientation=vertical]:h-4"
        />
        <BackButton />
      </div>

      {/* Right — user pill */}
      <div className="ml-auto flex items-center gap-2.5">
        <GeneratedAvatar
          variant="initials"
          seed={user.name}
          className="size-8"
        />
      </div>
    </header>
  );
};
