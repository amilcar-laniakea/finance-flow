"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Forces a server re-render every time this page is mounted (navigated to). */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => { router.refresh(); }, []);
  return null;
}
