import Link from "next/link";
import { Bus, CalendarDays, ClipboardList, Home, MapPin, UserRound } from "lucide-react";
import { Role } from "@/lib/domain";

function navItems(role: Role | string) {
  if (role === "ADMIN") {
    return [
      { href: "/", label: "Forside", icon: Home },
      { href: "/dashboard/admin", label: "Admin", icon: ClipboardList, active: true },
      { href: "/dashboard/admin/buses", label: "Kalender", icon: CalendarDays },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  if (role === "DRIVER") {
    return [
      { href: "/", label: "Forside", icon: Home },
      { href: "/dashboard/driver", label: "Ture", icon: ClipboardList, active: true },
      { href: "/dashboard/driver#vagter", label: "Vagter", icon: CalendarDays },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  if (role === "ORGANIZATION") {
    return [
      { href: "/", label: "Forside", icon: Home },
      { href: "/dashboard/organization", label: "Book", icon: Bus, active: true },
      { href: "/dashboard/organization/buses", label: "Kalender", icon: CalendarDays },
      { href: "/dashboard/profile", label: "Profil", icon: UserRound }
    ];
  }

  return [
    { href: "/", label: "Forside", icon: Home },
    { href: "/dashboard/citizen#ny-tur", label: "Ny tur", icon: MapPin },
    { href: "/dashboard/citizen#mine-ture", label: "Mine ture", icon: ClipboardList, active: true },
    { href: "/dashboard/profile", label: "Profil", icon: UserRound }
  ];
}

export function AppBottomNav({ role }: { role: Role | string }) {
  const items = navItems(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-fjord/20 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(14,37,91,0.10)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 text-[11px] font-bold text-ink">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`grid justify-items-center gap-1 rounded-2xl px-2 py-2 ${active ? "bg-cream text-brown" : "hover:bg-cream"}`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
