import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { botttsNeutral, initials } from "@dicebear/collection";

import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui";

interface GeneratedAvatarProps {
  seed: string;
  className?: string;
  variant?: "botttsNeutral" | "initials";
}

export const GeneratedAvatar = ({
  seed,
  className,
  variant = "initials",
}: GeneratedAvatarProps) => {
  const s = (seed ?? "").trim() || "U";

  const avatar = useMemo(() => {
    if (variant === "botttsNeutral") {
      return createAvatar(botttsNeutral, { seed: s });
    }
    return createAvatar(initials, {
      seed: s,
      fontWeight: 500,
      fontSize: 42,
    });
  }, [s, variant]);

  return (
    <Avatar className={cn(className)}>
      <AvatarImage src={avatar.toDataUri()} alt={`Avatar for ${s}`} />+{" "}
      <AvatarFallback>{s.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
};
