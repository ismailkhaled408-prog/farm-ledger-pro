import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Users, PlusCircle, Menu, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

const navItems = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/statement", label: "كشف حساب", icon: FileText },
  { to: "/partners", label: "العملاء", icon: Users },
  { to: "/transactions/new", label: "إضافة", icon: PlusCircle },
  { to: "/statistics", label: "إحصائيات", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

// Bottom nav shows only 5 items max for mobile
const bottomNavItems = navItems.slice(0, 5);

const NavItemContent = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => (
  <NavLink
    to={item.to}
    end={item.to === "/"}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
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
  const { data: settings } = useBusinessSettings();

  const businessName = settings?.business_name ?? "المتوكل على الله للدواجن";
  const businessSubtitle = settings?.business_subtitle ?? "جميع أنواع الأعلاف والدواجن";

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-sidebar text-sidebar-foreground px-4 py-2.5 flex items-center justify-between shrink-0 border-b border-sidebar-border">
          <h1 className="text-base font-bold truncate">🐔 {businessName}</h1>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground h-8 w-8" onClick={() => setSheetOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="bg-sidebar text-sidebar-foreground w-64 p-0">
            <VisuallyHidden.Root><SheetTitle>القائمة</SheetTitle></VisuallyHidden.Root>
            <div className="p-5 border-b border-sidebar-border">
              <h1 className="text-lg font-bold text-center">🐔 {businessName}</h1>
              <p className="text-[11px] text-center opacity-60 mt-1">{businessSubtitle}</p>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => (
                <NavItemContent key={item.to} item={item} onClick={() => setSheetOpen(false)} />
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto pb-16">
          <Outlet />
        </main>

        <nav className="no-print fixed bottom-0 inset-x-0 bg-sidebar/95 backdrop-blur-lg text-sidebar-foreground border-t border-sidebar-border z-40">
          <div className="flex justify-around items-center h-14 px-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-[10px] font-bold min-w-0 relative",
                    isActive
                      ? "text-primary"
                      : "text-sidebar-foreground/50"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -top-0.5 w-6 h-1 rounded-full bg-primary" />
                    )}
                    <item.icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="no-print w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-center">🐔 {businessName}</h1>
          <p className="text-xs text-center opacity-75 mt-1">{businessSubtitle}</p>
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
