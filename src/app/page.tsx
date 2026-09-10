import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const today = new Date();
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(today);

  return (
    <Dashboard
      currentDate={currentDate}
      currentDateTime={today.toISOString().slice(0, 10)}
    />
  );
}
