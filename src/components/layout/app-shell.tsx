import type { ReactNode } from "react";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-40 -translate-y-16 rounded-lg border border-primary/30 bg-card px-3 py-2 text-sm font-medium text-foreground transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div className="min-w-0 md:pl-[4.75rem] xl:pl-[17rem]">
        <TopBar />

        <div className="sticky top-[4.25rem] z-10 border-b border-border bg-background md:hidden">
          <PrimaryNavigation variant="mobile" />
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1500px] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
