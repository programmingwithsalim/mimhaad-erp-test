"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

// Menu structure organized by functionality with role-based access
const menuItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "manager", "finance", "operations", "cashier"],
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        roles: ["admin", "manager", "finance"],
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
        roles: ["admin", "manager", "finance", "operations", "cashier"],
      },
      {
        title: "Mobile Money",
        href: "/dashboard/momo",
        icon: Smartphone,
        roles: ["admin", "manager", "finance", "operations"],
      },
      {
        title: "Agency Banking",
        href: "/dashboard/agency-banking",
        icon: Banknote,
        roles: ["admin", "manager", "finance", "operations"],
      },
      {
        title: "E-Zwich",
        href: "/dashboard/e-zwich",
        icon: CreditCard,
        roles: ["admin", "manager", "finance", "operations"],
      },
      {
        title: "Power/Utilities",
        href: "/dashboard/power",
        icon: Zap,
        roles: ["admin", "manager", "finance", "operations"],
      },
      {
        title: "Jumia Pay",
        href: "/dashboard/jumia",
        icon: ShoppingCart,
        roles: ["admin", "manager", "finance", "operations"],
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
        roles: ["admin", "manager", "finance"],
      },
      {
        title: "Expenses",
        href: "/dashboard/expenses",
        icon: Receipt,
        roles: ["admin", "manager", "finance"],
      },
      {
        title: "Expense Approvals",
        href: "/dashboard/expenses/approvals",
        icon: CheckCircle,
        roles: ["admin", "manager", "finance"],
      },
      {
        title: "Commissions",
        href: "/dashboard/monthly-commissions",
        icon: TrendingUp,
        roles: ["admin", "manager", "finance"],
      },
      {
        title: "GL Accounting",
        href: "/dashboard/gl-accounting",
        icon: Calculator,
        roles: ["admin", "finance"],
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
        roles: ["admin", "manager", "finance"],
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
        roles: ["admin"], // Only admins can access user management
      },
      {
        title: "Branch Management",
        href: "/dashboard/branch-management",
        icon: Building2,
        roles: ["admin"], // Only admins can access branch management
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
        roles: ["admin", "manager", "finance"],
      },
      {
        title: "Audit Trail",
        href: "/dashboard/audit-trail",
        icon: Shield,
        roles: ["admin", "manager", "finance"],
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["admin", "manager", "finance", "operations", "cashier"],
      },
    ],
  },
]

export function SidebarNavigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Check if mobile on initial load
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])

  // Close mobile sidebar when navigating
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const hasPermission = (roles: string[]) => {
    if (!user?.role) return false
    return roles.includes(user.role.toLowerCase())
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
      window.location.href = "/"
    }
  }

  // Sidebar content component
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background border-r">
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden bg-white">
            <img src="/logo.png" alt="Mimhaad Logo" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">MIMHAAD</span>
              <span className="text-xs text-muted-foreground">Financial Services</span>
            </div>
          )}
        </div>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <ChevronRight
              size={20}
              className={cn("transition-transform duration-200", isCollapsed ? "rotate-0" : "rotate-180")}
            />
          </Button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-4 px-3">
          {menuItems.map((section) => {
            const visibleItems = section.items.filter((item) => hasPermission(item.roles))

            if (visibleItems.length === 0) return null

            return (
              <div key={section.title} className="space-y-2">
                {/* Section Header - Only show when not collapsed */}
                {!isCollapsed && (
                  <div className="px-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}

                {/* Menu Items */}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3 px-3 py-2 h-auto text-sm font-normal",
                            isCollapsed && "justify-center px-0",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground/70 hover:bg-accent hover:text-foreground",
                          )}
                          title={isCollapsed ? item.title : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-foreground/70 hover:bg-accent hover:text-foreground",
            isCollapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 lg:hidden" onClick={toggleMobileSidebar}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        {/* Mobile overlay and sidebar */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="fixed left-0 top-0 h-full w-64 bg-background shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent />
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop sidebar
  return (
    <div className={cn("hidden lg:flex flex-col transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
      <SidebarContent />
    </div>
  )
}
