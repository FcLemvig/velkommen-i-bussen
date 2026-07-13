import Link from "next/link";
import { Bus, CalendarDays, ClipboardList, Home, UserRound } from "lucide-react";
import { Role } from "@/lib/domain";

function primaryDashboard(role: Role | string) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "DRIVER") return "/dashboard/driver";
  if (role === "ORGANIZATION") return "/dashboard/organization";
  return "/dashboard/citizen";
}

function calendarPath(role: Role | string) {
  if (role === "ADMIN") return "/dashboard/admin/buses";
  if (role === "ORGANIZATION") return "/dashboard/organization/buses";
  if (role === "DRIVER") return "/dashboard/driver";
  return "/dashboard/citizen";
}

export function AppBottomNav({ role }: { role: Role | string }) {
  const dashboard = primaryDashboard(role);
  const calendar = calendarPath(role);
  const isAdmin = role === "ADMIN";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-fjord/20 bg-white/95 px-3 py-2 shadow-[0_-10px_30px_rgba(14,37,91,0.10)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 text-[11px] font-bold text-ink">
        <Link href="/" className="grid justify-items-center gap-1 rounded-2xl px-2 py-2 hover:bg-cream">
          <Home size={20} />
          Forside
        </Link>
        <Link href={dashboard} className="grid justify-items-center gap-1 rounded-2xl bg-cream px-2 py-2 text-brown">
          <ClipboardList size={20} />
          {isAdmin ? "Admin" : "Mine"}
        </Link>
        <Link href={calendar} className="grid justify-items-center gap-1 rounded-2xl px-2 py-2 hover:bg-cream">
          <CalendarDays size={20} />
          Kalender
        </Link>
        <Link href="/dashboard" className="grid justify-items-center gap-1 rounded-2xl px-2 py-2 hover:bg-cream">
          {role === "ORGANIZATION" ? <Bus size={20} /> : <UserRound size={20} />}
          Profil
        </Link>
      </div>
    </nav>
  );
}
