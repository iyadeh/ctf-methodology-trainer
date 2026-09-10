import { ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PrimaryNavigation } from "@/components/layout/primary-navigation";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[4.75rem] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex xl:w-[17rem]">
      <div className="flex h-[4.25rem] shrink-0 items-center border-b border-sidebar-border px-3 xl:px-4">
        <Link
          href="/"
          aria-label="CTF Methodology Trainer home"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <span className="md:sr-only xl:not-sr-only xl:min-w-0">
            <span className="block truncate text-[0.8125rem] font-semibold tracking-tight">
              CTF Methodology Trainer
            </span>
            <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
              Learn. Practice. Hack Smarter.
            </span>
          </span>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <PrimaryNavigation variant="sidebar" />

        <div className="mt-auto border-t border-sidebar-border pt-3">
          <div className="flex items-start justify-center gap-3 rounded-lg border border-sidebar-border bg-muted/25 p-3 text-muted-foreground xl:justify-start">
            <TrendingUp
              aria-hidden="true"
              className="mt-0.5 size-[1.125rem] shrink-0 text-primary"
              strokeWidth={1.75}
            />
            <div className="md:sr-only xl:not-sr-only">
              <p className="text-xs font-semibold text-sidebar-foreground">Level Up</p>
              <p className="mt-1 text-xs leading-5">
                Consistent practice builds real skills.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
