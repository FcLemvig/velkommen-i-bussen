"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Bus, CalendarDays, ClipboardList, Home, MapPin, UserRound } from "lucide-react";
import { Role } from "@/lib/domain";

function visibleRole(pathname: string, fallbackRole: Role | string, accessRoles: string[]) {
  if (pathname.startsWith("/dashboard/admin") && accessRoles.includes("ADMIN")) return "ADMIN";
  if (pathname.startsWith("/dashboard/driver") && accessRoles.includes("DRIVER")) return "DRIVER";
  if (pathname.startsWith("/dashboard/organization") && accessRoles.includes("ORGANIZATION")) return "ORGANIZATION";
  if (pathname.startsWith("/dashboard/citizen") && accessRoles.includes("CITIZEN")) return "CITIZEN";

  if (accessRoles.includes("CITIZEN") && accessRoles.includes("DRIVER")) return "MULTI";
  return fallbackRole;
}

function navItems(role: Role | string) {
  if (role === "MULTI") {
    return [
      { href: "/dashboard", label: "Min side", icon: Home },
      { href: "/dashboard/citizen", label: "Borger", icon: UserRound },
      { href: "/dashboard/driver", label: "Chauffør", icon: Bus },
      { href: "/dashboard/notifications", label: "Beskeder", icon: Bell },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  if (role === "ADMIN") {
    return [
      { href: "/dashboard/admin", label: "Ture", icon: ClipboardList },
      { href: "/dashboard/admin/shifts", label: "Vagter", icon: CalendarDays },
      { href: "/dashboard/admin/buses", label: "Kalender", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Beskeder", icon: Bell },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  if (role === "DRIVER") {
    return [
      { href: "/dashboard/driver", label: "Ture", icon: ClipboardList },
      { href: "/dashboard/driver#vagter", label: "Vagter", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Beskeder", icon: Bell },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  if (role === "ORGANIZATION") {
    return [
      { href: "/dashboard/organization", label: "Book", icon: Bus },
      { href: "/dashboard/organization/buses", label: "Kalender", icon: CalendarDays },
      { href: "/dashboard/notifications", label: "Beskeder", icon: Bell },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  return [
    { href: "/dashboard/citizen", label: "Min side", icon: Home },
    { href: "/dashboard/citizen/events", label: "Fællesture", icon: CalendarDays },
    { href: "/dashboard/citizen#ny-tur", label: "Ny tur", icon: MapPin },
    { href: "/dashboard/notifications", label: "Beskeder", icon: Bell },
    { href: "/dashboard/profile", label: "Profil", icon: UserRound }
  ];
}

function itemIsActive(pathname: string, hash: string, href: string) {
  const [itemPath, itemHash = ""] = href.split("#");

  if (pathname !== itemPath) return false;
  if (itemHash) return hash === `#${itemHash}`;

  return !hash;
}

export function AppBottomNav({
  role,
  accessRoles,
  unreadCount = 0
}: {
  role: Role | string;
  accessRoles: string[];
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const currentRole = visibleRole(pathname, role, accessRoles);
  const items = navItems(currentRole);

  useEffect(() => {
    function updateHash() {
      setHash(window.location.hash);
    }

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-fjord/20 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(14,37,91,0.10)] backdrop-blur md:hidden">
      <div
        className="mx-auto grid max-w-md gap-1 text-xs font-bold text-ink"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = itemIsActive(pathname, hash, href);

          return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`grid min-w-0 justify-items-center gap-1 rounded-2xl px-1 py-2 ${active ? "bg-cream text-brown" : "hover:bg-cream"}`}
          >
            <span className="relative">
              <Icon size={20} />
              {href === "/dashboard/notifications" && unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-bus px-1 text-[10px] leading-none text-ink">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </span>
            <span className="max-w-full truncate">{label}</span>
          </Link>
          );
        })}
      </div>
    </nav>
  );
}
