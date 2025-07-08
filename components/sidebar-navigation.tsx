"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Banknote,
  Receipt,
  Settings,
  FileText,
  Shield,
  Zap,
  ShoppingCart,
  Smartphone,
  Wallet,
  TrendingUp,
  Database,
  Calculator,
  ChevronRight,
  Menu,
  X,
  LogOut,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useRBAC } from "@/components/rbac/rbac-provider";
import { normalizeRole, type Role } from "@/lib/rbac/unified-rbac";

// Menu structure organized by functionality with role-based access
const menuItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: [
          "Admin",
          "Manager",
          "Finance",
          "Operations",
          "Cashier",
          "Supervisor",
        ],
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        roles: ["Admin", "Manager", "Finance"],
      },
    ],
  },
  {
    title: "Transactions",
    items: [
      {
        title: "All Transactions",
        href: "/dashboard/transactions/all",
        icon: Receipt,
        roles: [
          "Admin",
          "Manager",
          "Finance",
          "Operations",
          "Cashier",
          "Supervisor",
        ],
      },
      {
        title: "Mobile Money",
        href: "/dashboard/momo",
        icon: Smartphone,
        roles: ["Admin", "Manager", "Operations", "Supervisor", "Cashier"],
      },
      {
        title: "Agency Banking",
        href: "/dashboard/agency-banking",
        icon: Banknote,
        roles: ["Admin", "Manager", "Operations", "Supervisor", "Cashier"],
      },
      {
        title: "E-Zwich",
        href: "/dashboard/e-zwich",
        icon: CreditCard,
        roles: ["Admin", "Manager", "Operations", "Supervisor", "Cashier"],
      },
      {
        title: "Power/Utilities",
        href: "/dashboard/power",
        icon: Zap,
        roles: ["Admin", "Manager", "Operations", "Supervisor", "Cashier"],
      },
      {
        title: "Jumia Pay",
        href: "/dashboard/jumia",
        icon: ShoppingCart,
        roles: ["Admin", "Manager", "Operations", "Supervisor", "Cashier"],
      },
    ],
  },
  {
    title: "Financial Management",
    items: [
      {
        title: "Float Management",
        href: "/dashboard/float-management",
        icon: Wallet,
        roles: ["Admin", "Manager", "Finance"],
      },
      {
        title: "Expenses",
        href: "/dashboard/expenses",
        icon: Receipt,
        roles: ["Admin", "Manager", "Finance"],
      },
      {
        title: "Expense Approvals",
        href: "/dashboard/expenses/approvals",
        icon: CheckCircle,
        roles: ["Admin", "Manager", "Finance"],
      },
      {
        title: "Commissions",
        href: "/dashboard/commissions",
        icon: TrendingUp,
        roles: ["Admin", "Manager", "Finance"],
      },
      {
        title: "GL Accounting",
        href: "/dashboard/gl-accounting",
        icon: Calculator,
        roles: ["Admin", "Finance"],
      },
    ],
  },
  {
    title: "Inventory & Assets",
    items: [
      {
        title: "E-Zwich Inventory",
        href: "/dashboard/inventory/e-zwich",
        icon: Database,
        roles: ["Admin", "Manager", "Finance"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "User Management",
        href: "/dashboard/user-management",
        icon: Users,
        roles: ["Admin"], // Only admins can access user management
      },
      {
        title: "Branch Management",
        href: "/dashboard/branch-management",
        icon: Building2,
        roles: ["Admin"], // Only admins can access branch management
      },
    ],
  },
  {
    title: "Reports & Analytics",
    items: [
      {
        title: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        roles: ["Admin", "Manager", "Finance"],
      },
      {
        title: "Audit Trail",
        href: "/dashboard/audit-trail",
        icon: Shield,
        roles: ["Admin", "Manager", "Finance"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Admin Panel",
        href: "/dashboard/admin",
        icon: Shield,
        roles: ["Admin"], // Only admins can access admin panel
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: [
          "Admin",
          "Manager",
          "Finance",
          "Operations",
          "Cashier",
          "Supervisor",
        ],
      },
    ],
  },
];

export function SidebarNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { userRole } = useRBAC();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Debug log for user and userRole
  useEffect(() => {
    console.log("[Sidebar] user:", user);
    console.log("[Sidebar] userRole:", userRole);
  }, [user, userRole]);

  // Check if mobile on initial load
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const hasPermission = (roles: Role[]) => {
    return userRole ? roles.includes(userRole) : false;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="MIMHAAD Logo"
            className="h-10 w-10 object-cover"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold leading-tight">MIMHAAD</span>
              <span className="text-xs text-muted-foreground leading-tight">
                Financial Services
              </span>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-4 p-2">
        {menuItems.map((section) => {
          const visibleItems = section.items.filter((item) =>
            hasPermission(item.roles as Role[])
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider bg-muted/60 rounded mb-2 text-muted-foreground">
                  {section.title}
                </h3>
              )}
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout - fixed at bottom */}
      {user && (
        <div className="border-t p-4 bg-background sticky bottom-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userRole || user.role}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-8 p-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileSidebar}
          className="fixed top-4 left-4 z-50 h-10 w-10 p-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={toggleMobileSidebar}
          >
            <div
              className="fixed left-0 top-0 h-full w-64 bg-background border-r"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 items-center justify-between border-b px-4">
                <span className="font-semibold">MIMHAAD</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileSidebar}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar
  return (
    <div
      className={cn(
        "h-full border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent />
    </div>
  );
}
