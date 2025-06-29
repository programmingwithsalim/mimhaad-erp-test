import { UserManagementDashboard } from "@/components/user-management/user-management-dashboard"

export default function UserManagementPage() {
  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
      </div>

      <UserManagementDashboard />
    </div>
  )
}
