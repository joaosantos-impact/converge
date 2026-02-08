"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CurrencySelector } from "@/components/CurrencySelector";
import { CommandMenu } from "@/components/CommandMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useExchangeAccounts } from "@/hooks/use-exchange-accounts";

function SyncIndicator() {
  const { syncing } = useAutoSync();
  const { data: accounts = [] } = useExchangeAccounts();

  if (!syncing || accounts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" title="A sincronizar...">
      <div className="w-3.5 h-3.5 border-[1.5px] border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      <span className="text-[10px] text-muted-foreground hidden sm:inline">Sincronizando</span>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 items-center gap-4 px-8">
          <SidebarTrigger className="-ml-2 hover:bg-muted" />
          <div className="flex-1" />
          <SyncIndicator />
          <CurrencySelector />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto px-8 pb-8">
          <Breadcrumbs />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
