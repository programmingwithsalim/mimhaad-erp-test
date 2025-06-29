"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Lock, Bell, Building, Settings, Shield } from "lucide-react"
import { UpdatePasswordForm } from "@/components/settings/update-password-form"
import { UpdateProfileForm } from "@/components/settings/update-profile-form"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { OrganizationSettings } from "@/components/settings/organization-settings"
import { SystemConfigSettings } from "@/components/settings/system-config-settings"
import { RolePermissionSettings } from "@/components/settings/role-permission-settings"
import { useCurrentUser } from "@/hooks/use-current-user"

const SettingsPageRedesigned = () => {
  const { user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState("profile")

  const isAdmin = user?.role === "admin"
  const isManager = user?.role === "manager" || user?.role === "admin"

  const tabs = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Manage your personal information",
      available: true,
    },
    {
      id: "security",
      label: "Security",
      icon: Lock,
      description: "Password and security settings",
      available: true,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Email and SMS preferences",
      available: true,
    },
    {
      id: "organization",
      label: "Organization",
      icon: Building,
      description: "Organization-wide settings",
      available: isManager,
    },
    {
      id: "system",
      label: "System",
      icon: Settings,
      description: "System configuration",
      available: isAdmin,
    },
    {
      id: "permissions",
      label: "Permissions",
      icon: Shield,
      description: "Roles and permissions",
      available: isAdmin,
    },
  ]

  const availableTabs = tabs.filter((tab) => tab.available)

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings and system preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {user?.role || "User"} Access
            </Badge>
            {user?.branchName && (
              <Badge variant="secondary" className="text-sm">
                {user.branchName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                        activeTab === tab.id
                          ? "bg-muted text-foreground border-r-2 border-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-muted-foreground">{tab.description}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-4">
          <div className="space-y-6">
            {/* Profile Settings */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
                  <p className="text-muted-foreground">Update your personal information and profile picture</p>
                </div>
                <Separator />
                <UpdateProfileForm />
              </div>
            )}

            {/* Security Settings */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
                  <p className="text-muted-foreground">Manage your password and security preferences</p>
                </div>
                <Separator />
                <UpdatePasswordForm />
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
                  <p className="text-muted-foreground">Configure how you receive notifications via email and SMS</p>
                </div>
                <Separator />
                <NotificationSettings />
              </div>
            )}

            {/* Organization Settings */}
            {activeTab === "organization" && isManager && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
                  <p className="text-muted-foreground">Manage organization-wide settings and configurations</p>
                </div>
                <Separator />
                <OrganizationSettings />
              </div>
            )}

            {/* System Settings */}
            {activeTab === "system" && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
                  <p className="text-muted-foreground">Configure system-wide settings and parameters</p>
                </div>
                <Separator />
                <SystemConfigSettings userRole={user?.role || "user"} />
              </div>
            )}

            {/* Permissions Settings */}
            {activeTab === "permissions" && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
                  <p className="text-muted-foreground">Manage user roles and system permissions</p>
                </div>
                <Separator />
                <RolePermissionSettings userRole={user?.role || "user"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPageRedesigned
