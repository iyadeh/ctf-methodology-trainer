"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  LayoutDashboard,
  ListChecks,
  PlusSquare,
  Settings,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type PrimaryNavigationProps = {
  variant: "mobile" | "sidebar";
};

const navigationItems: NavigationItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/training", icon: ListChecks, label: "Training Sessions" },
  { href: "/training/new", icon: PlusSquare, label: "New Training" },
  { href: "/methodology", icon: Waypoints, label: "Methodology" },
  { href: "/knowledge", icon: BookOpenText, label: "Knowledge Base" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  if (href === "/training") {
    return (
      pathname === href ||
      (pathname.startsWith("/training/") &&
        !pathname.startsWith("/training/new"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNavigation({ variant }: PrimaryNavigationProps) {
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  return (
    <nav aria-label="Primary navigation" className="min-w-0">
      <ul
        className={cn(
          isSidebar
            ? "flex flex-col gap-1"
            : "flex gap-1 overflow-x-auto px-3 py-2",
        )}
      >
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const isActive = isActiveRoute(pathname, href);

          return (
            <li key={href} className={cn(!isSidebar && "shrink-0")}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                title={isSidebar ? label : undefined}
                className={cn(
                  "group flex items-center gap-3 whitespace-nowrap rounded-lg border border-transparent text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px motion-reduce:transition-none",
                  isSidebar
                    ? "h-10 justify-center px-0 xl:justify-start xl:px-3"
                    : "h-9 px-3 text-xs sm:text-sm",
                  isActive
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-[1.125rem] shrink-0"
                />
                <span className={cn(isSidebar && "md:sr-only xl:not-sr-only")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
