import { Bell, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex h-[4.25rem] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <Link
          href="/"
          aria-label="CTF Methodology Trainer home"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ShieldCheck aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
        </Link>

        <div className="relative min-w-0 flex-1 sm:max-w-xl">
          <label htmlFor="global-search" className="sr-only">
            Global search
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            id="global-search"
            type="search"
            autoComplete="off"
            placeholder="Search machines, topics, or methodology..."
            className="h-9 border-border bg-muted/25 pl-9 text-sm placeholder:text-muted-foreground/80 focus-visible:bg-muted/40"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="flex size-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px motion-reduce:transition-none"
          >
            <Bell aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
          </button>

          <Link
            href="/settings"
            aria-label="Open profile settings for Arga"
            className="flex h-10 items-center gap-2 rounded-lg border border-transparent px-1.5 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px motion-reduce:transition-none sm:px-2"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 font-mono text-[0.6875rem] font-semibold text-primary">
                AR
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-foreground sm:inline">
              Arga
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
