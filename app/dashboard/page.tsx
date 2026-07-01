import { redirect } from "next/navigation";
import { dashboardPathForRole, requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  redirect(dashboardPathForRole(user.role));
}
