import { fetchAvailableGeminiModels, getAppSettings } from "@/modules/settings";
import { SettingsShell } from "@/components/settings/settings-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const [settings, initialModels] = await Promise.all([
    getAppSettings(),
    fetchAvailableGeminiModels(),
  ]);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <SettingsShell
      initialSettings={settings}
      initialModels={initialModels}
      formattedDate={formattedDate}
    />
  );
}
