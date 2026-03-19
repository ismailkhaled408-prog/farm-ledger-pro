import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Users, PlusCircle, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const navItems = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/statement", label: "كشف حساب", icon: FileText },
  { to: "/partners", label: "العملاء", icon: Users },
  { to: "/transactions/new", label: "إضافة", icon: PlusCircle },
];

const NavItemContent = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => (
  <NavLink
    to={item.to}
    end={item.to === "/"}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-semibold",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      )
    }
  >
    <item.icon className="h-5 w-5" />
    {item.label}
  </NavLink>
);

const AppLayout = () => {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Mobile layout: top bar + bottom nav
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold">🐔 المتوكل على الله</h1>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setSheetOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Side menu sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="bg-sidebar text-sidebar-foreground w-64 p-0">
            <VisuallyHidden.Root><SheetTitle>القائمة</SheetTitle></VisuallyHidden.Root>
            <div className="p-6 border-b border-sidebar-border">
              <h1 className="text-xl font-bold text-center">🐔 المتوكل على الله</h1>
              <p className="text-xs text-center opacity-75 mt-1">للدواجن والأعلاف</p>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <NavItemContent key={item.to} item={item} onClick={() => setSheetOpen(false)} />
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="no-print fixed bottom-0 inset-x-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border z-40">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-xs font-semibold min-w-0",
                    isActive
                      ? "text-accent"
                      : "text-sidebar-foreground/70"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  // Desktop layout: sidebar
  return (
    <div className="flex min-h-screen">
      <aside className="no-print w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-center">🐔 المتوكل على الله</h1>
          <p className="text-xs text-center opacity-75 mt-1">للدواجن والأعلاف</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavItemContent key={item.to} item={item} />
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
