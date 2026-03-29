"use client";

import { useTheme } from "next-themes";

import { shadesOfPurple, dark } from "@clerk/themes";

export const useClerkTheme = (): typeof dark | undefined => {
  const { resolvedTheme } = useTheme();

  const themes = {
    light: undefined,
    dark,
    purple: shadesOfPurple,
  } as const;

  return themes[resolvedTheme as keyof typeof themes] || themes.light;
};
