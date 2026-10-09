import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/modules/training/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const today = new Date();
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(today);

  const data = await getDashboardData();

  return (
    <Dashboard
      currentDate={currentDate}
      currentDateTime={today.toISOString().slice(0, 10)}
      data={data}
    />
  );
}
