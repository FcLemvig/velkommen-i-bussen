"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/lib/domain";

const routesByRole: Record<string, string[]> = {
  ADMIN: [
    "/dashboard/admin",
    "/dashboard/admin/shifts",
    "/dashboard/admin/buses",
    "/dashboard/admin/citizens",
    "/dashboard/admin/drivers",
    "/dashboard/notifications",
    "/dashboard/profile"
  ],
  DRIVER: ["/dashboard/driver", "/dashboard/notifications", "/dashboard/profile"],
  ORGANIZATION: ["/dashboard/organization", "/dashboard/organization/buses", "/dashboard/notifications", "/dashboard/profile"],
  CITIZEN: ["/dashboard/citizen", "/dashboard/notifications", "/dashboard/profile"]
};

export function AppRoutePrefetcher({ role }: { role: Role | string }) {
  const router = useRouter();

  useEffect(() => {
    const routes = routesByRole[role] ?? routesByRole.CITIZEN;

    const prefetch = () => {
      routes.forEach((route) => router.prefetch(route));
    };

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback(handle);
    }

    const timeout = setTimeout(prefetch, 900);
    return () => clearTimeout(timeout);
  }, [role, router]);

  return null;
}
