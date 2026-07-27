"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav } from "@/config/nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { NavUser } from "@/components/layout/nav-user";
import type { NotificationRow } from "@/types/database.types";

function MobileNav({ toReviewEmails }: { toReviewEmails: number }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scale className="size-4" />
            </div>
            LIA
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-6 p-3">
          <div className="flex flex-col gap-0.5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.badgeKey === "toReviewEmails" ? toReviewEmails : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.title}</span>
                  {badge ? (
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[11px]">
                      {badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-col gap-0.5">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function AppTopbar({
  userId,
  fullName,
  email,
  avatarUrl,
  toReviewEmails,
  initialNotifications,
}: {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  toReviewEmails: number;
  initialNotifications: NotificationRow[];
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <MobileNav toReviewEmails={toReviewEmails} />

      <div className="flex flex-1 justify-start">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationsBell userId={userId} initialNotifications={initialNotifications} />
        <NavUser fullName={fullName} email={email} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
