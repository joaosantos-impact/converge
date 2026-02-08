"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession, signOut } from "@/lib/auth-client";
import {
  LayoutDashboard,
  Wallet,
  Link2,
  Newspaper,
  Receipt,
  Rss,
  Bell,
  History,
  Trophy,
  Settings,
  Calculator,
  LogOut,
  GitCompare,
  Target,
  BookOpen,
  PenLine,
} from "lucide-react";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Portfolio", href: "/dashboard/portfolio", icon: Wallet },
  { title: "Integrações", href: "/dashboard/integrations", icon: Link2 },
  { title: "Trades", href: "/dashboard/history", icon: History },
  { title: "Alertas", href: "/dashboard/alerts", icon: Bell },
  { title: "Impostos", href: "/dashboard/taxes", icon: Receipt },
];

const toolsNav = [
  { title: "DCA Calculator", href: "/dashboard/dca", icon: Calculator },
  { title: "Comparador", href: "/dashboard/compare", icon: GitCompare },
  { title: "Objetivos", href: "/dashboard/goals", icon: Target },
  { title: "Journal", href: "/dashboard/journal", icon: PenLine },
];

const communityNav = [
  { title: "Feed", href: "/dashboard/feed", icon: Newspaper },
  { title: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { title: "Notícias", href: "/dashboard/news", icon: Rss },
  { title: "Blog", href: "/dashboard/blog", icon: BookOpen },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Conta';

  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    router.push('/');
  };

  const renderNavItems = (items: typeof mainNav) => (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => {
        // Exact match for /dashboard, startsWith for all other routes
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
        
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton 
              asChild 
              isActive={isActive}
              className="h-8 px-2.5 transition-colors hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
            >
              <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const settingsActive = pathname.startsWith('/dashboard/settings');

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-3 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-foreground shrink-0">
            <span className="text-[10px] font-bold text-background">C</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">Converge</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] text-muted-foreground uppercase tracking-widest px-2 mb-0.5">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(mainNav)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[9px] text-muted-foreground uppercase tracking-widest px-2 mb-0.5">
            Ferramentas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(toolsNav)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[9px] text-muted-foreground uppercase tracking-widest px-2 mb-0.5">
            Comunidade
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(communityNav)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-0.5">
        <button
          onClick={() => setLogoutOpen(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
          aria-label="Terminar sessão"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sair</span>
        </button>

        <SidebarSeparator />

        <Link href="/dashboard/settings">
          <div className={`flex items-center gap-2 px-2 py-1.5 transition-colors cursor-pointer ${
            settingsActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
          }`}>
            <div className="w-6 h-6 bg-muted flex items-center justify-center text-[10px] font-medium shrink-0 rounded-sm overflow-hidden">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="" width={24} height={24} className="w-full h-full object-cover" unoptimized />
              ) : (
                userName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground">Conta & Definições</p>
            </div>
            <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        </Link>
      </SidebarFooter>

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres sair da tua conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
