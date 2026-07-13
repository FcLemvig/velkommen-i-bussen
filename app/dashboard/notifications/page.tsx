import Link from "next/link";
import { Bell, CheckCheck, SlidersHorizontal } from "lucide-react";
import { markAllNotificationsReadAction, updateDriverNotificationPreferencesAction } from "@/app/dashboard/notifications/actions";
import { FormMessage } from "@/components/FormMessage";
import { PushPermissionButton } from "@/components/PushPermissionButton";
import { dashboardPathForRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vapidPublicKey } from "@/lib/push";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [notifications, pushCount, driverPreferences] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.pushSubscription.count({
      where: { userId: user.id }
    }),
    user.role === "DRIVER"
      ? prisma.driverNotificationPreference.findUnique({
          where: { userId: user.id }
        })
      : null
  ]);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const preferences = {
    newShifts: driverPreferences?.newShifts ?? true,
    assignedRides: driverPreferences?.assignedRides ?? true,
    rideChanges: driverPreferences?.rideChanges ?? true
  };

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 pb-24 pt-5 md:py-8">
      <section className="rounded-[28px] bg-ink p-5 text-white shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-bus">BESKEDER</p>
            <h1 className="mt-2 text-3xl font-bold">Notifikationer</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Her samles beskeder om ture, vagter og busbookinger.
            </p>
          </div>
          <Link href={dashboardPathForRole(user.role)} className="button bg-white text-ink hover:bg-cream">
            Tilbage
          </Link>
        </div>
      </section>

      <FormMessage message={params.error || params.success} />

      <PushPermissionButton publicKey={vapidPublicKey} />

      {user.role === "DRIVER" ? (
        <form action={updateDriverNotificationPreferencesAction} className="grid gap-4 rounded-[24px] border border-fjord/20 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fjord/20 text-ink">
              <SlidersHorizontal size={22} />
            </span>
            <div>
              <h2 className="font-bold text-ink">Chaufførbeskeder</h2>
              <p className="text-sm text-slate-600">Vælg hvilke typer beskeder du vil modtage.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-cream/70 p-3 text-sm">
            <input name="newShifts" type="checkbox" defaultChecked={preferences.newShifts} className="mt-1 h-5 w-5" />
            <span>
              <span className="block font-bold text-ink">Nye vagter</span>
              <span className="text-slate-600">Når admin opretter en ledig vagt, som chauffører kan tage.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl bg-cream/70 p-3 text-sm">
            <input name="assignedRides" type="checkbox" defaultChecked={preferences.assignedRides} className="mt-1 h-5 w-5" />
            <span>
              <span className="block font-bold text-ink">Tildelte ture</span>
              <span className="text-slate-600">Når du bliver sat på en tur eller busbooking.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl bg-cream/70 p-3 text-sm">
            <input name="rideChanges" type="checkbox" defaultChecked={preferences.rideChanges} className="mt-1 h-5 w-5" />
            <span>
              <span className="block font-bold text-ink">Ændringer og aflysninger</span>
              <span className="text-slate-600">Når en tur ændres, annulleres eller får ny status.</span>
            </span>
          </label>

          <button type="submit" className="w-full bg-bus text-white hover:bg-bus/90 sm:w-fit">
            Gem indstillinger
          </button>
        </form>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-fjord/20 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bus/15 text-brown">
            <Bell size={22} />
          </span>
          <div>
            <p className="font-bold text-ink">{unreadCount} ulæste besked(er)</p>
            <p className="text-sm text-slate-600">
              {notifications.length} besked(er) i alt - {pushCount} enhed(er) med push
            </p>
          </div>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="gap-2 bg-bus text-white hover:bg-bus/90">
              <CheckCheck size={16} />
              Marker læst
            </button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-[24px] border p-4 shadow-sm ${
              notification.readAt ? "border-fjord/15 bg-white" : "border-bus/30 bg-bus/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink">{notification.title}</h2>
                <p className="mt-1 text-sm text-slate-700">{notification.body}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  {notification.createdAt.toLocaleDateString("da-DK")} kl.{" "}
                  {notification.createdAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {!notification.readAt ? <span className="rounded-full bg-bus px-2.5 py-1 text-xs font-bold text-white">Ny</span> : null}
            </div>
            {notification.href ? (
              <Link href={notification.href} className="mt-4 inline-flex text-sm font-bold text-brown hover:text-ink">
                Åbn
              </Link>
            ) : null}
          </article>
        ))}

        {notifications.length === 0 ? (
          <div className="rounded-[24px] border border-fjord/20 bg-white p-8 text-center shadow-sm">
            <Bell className="mx-auto text-bus" size={34} />
            <h2 className="mt-3 text-xl font-bold text-ink">Ingen beskeder endnu</h2>
            <p className="mt-2 text-sm text-slate-600">Når der sker noget vigtigt, vises det her.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
