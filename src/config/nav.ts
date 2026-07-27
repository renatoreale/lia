import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  FileText,
  Inbox,
  LayoutDashboard,
  PenSquare,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "toReviewEmails" | "unreadNotifications";
}

export const primaryNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Condomini", href: "/condomini", icon: Building2 },
  { title: "Documenti", href: "/documenti", icon: FileText },
  { title: "Ricerca AI", href: "/ricerca", icon: Sparkles },
  { title: "Email", href: "/email", icon: Inbox, badgeKey: "toReviewEmails" },
  { title: "Bozze", href: "/email/bozze", icon: PenSquare },
  { title: "Statistiche", href: "/statistiche", icon: BarChart3 },
];

export const secondaryNav: NavItem[] = [
  { title: "Utenti", href: "/utenti", icon: Users },
  { title: "Integrazioni", href: "/integrazioni", icon: Plug },
  { title: "Impostazioni", href: "/impostazioni", icon: Settings },
];

export const superAdminNav: NavItem[] = [
  { title: "Super Admin", href: "/super-admin", icon: ShieldCheck },
];
