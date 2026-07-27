"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";

import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, type NavItem } from "@/config/nav";
import { Badge } from "@/components/ui/badge";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.title}</span>
      {badge ? (
        <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[11px]">
          {badge > 99 ? "99+" : badge}
        </Badge>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  toReviewEmails = 0,
  companyName,
}: {
  toReviewEmails?: number;
  companyName?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Scale className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-semibold text-sidebar-foreground">LIA</span>
          {companyName ? (
            <span className="truncate text-[11px] text-sidebar-foreground/50">{companyName}</span>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              badge={item.badgeKey === "toReviewEmails" ? toReviewEmails : undefined}
            />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium tracking-wide text-sidebar-foreground/40 uppercase">
            Amministrazione
          </p>
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
