"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Users, Shield, Plus, Edit, Trash2, Save, X, Loader2 } from "lucide-react"

interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  category: string
  is_system: boolean
}

interface Role {
  id: string
  name: string
  display_name: string
  description?: string
  color: string
  is_default: boolean
  is_system: boolean
  priority: number
  permissions: Permission[]
  user_count: number
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  branchName?: string
}

export function RolePermissionSettingsFixed() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isEditingRole, setIsEditingRole] = useState(false)
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDisplayName, setNewRoleDisplayName] = useState("")
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Load roles, permissions, and users in parallel
      const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all([
        fetch("/api/settings/roles/dynamic", { credentials: "include" }),
        fetch("/api/settings/permissions", { credentials: "include" }),
        fetch("/api/users", { credentials: "include" }),
      ])

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData.data || [])
      }

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json()
        setPermissions(permissionsData.data || [])
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.data || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load roles and permissions data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc: any, permission: Permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {})

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Role name and display name are required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch("/api/settings/roles/dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newRoleName.toLowerCase().replace(/\s+/g, "_"),
          display_name: newRoleDisplayName,
          description: newRoleDescription,
          permissions: selectedPermissions,
          created_by: "current_user", // You can get this from auth context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create role")
      }

      await loadData() // Reload data
      setIsCreatingRole(false)
      setNewRoleName("")
      setNewRoleDisplayName("")
      setNewRoleDescription("")
      setSelectedPermissions([])

      toast({
        title: "Success",
        description: "Role created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create role",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return

    try {
      setIsSaving(true)

      const response = await fetch(`/api/settings/roles/dynamic/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          permissions: selectedPermissions,
          updated_by: "current_user",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update role")
      }

      await loadData() // Reload data
      setIsEditingRole(false)
      setSelectedRole(null)

      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (role?.is_system) {
      toast({
        title: "Error",
        description: "Cannot delete system roles",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/settings/roles/dynamic/${roleId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete role")
      }

      await loadData() // Reload data
      toast({
        title: "Success",
        description: "Role deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete role",
        variant: "destructive",
      })
    }
  }

  const handleUserRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user role")
      }

      // Update local state
      setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))

      toast({
        title: "Success",
        description: "User role updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  const startEditingRole = (role: Role) => {
    setSelectedRole(role)
    setSelectedPermissions(role.permissions.map((p) => p.id))
    setIsEditingRole(true)
  }

  const startCreatingRole = () => {
    setSelectedPermissions([])
    setIsCreatingRole(true)
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((p) => p !== permissionId) : [...prev, permissionId],
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading roles and permissions...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Roles Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage user roles with specific permissions
              </p>
            </div>
            <Button onClick={startCreatingRole} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{role.display_name}</h3>
                    {role.is_system && <Badge variant="secondary">System</Badge>}
                    {role.is_default && <Badge variant="outline">Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role.permissions.length} permissions • {role.user_count} users
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditingRole(role)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Role Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Assignment
          </CardTitle>
          <p className="text-sm text-muted-foreground">Assign and manage user roles</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{`${user.firstName} ${user.lastName}`}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.branchName && <p className="text-xs text-muted-foreground">{user.branchName}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.role}</Badge>
                  <Select value={user.role} onValueChange={(newRole) => handleUserRoleChange(user.id, newRole)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="roleName">Role Name (Internal)</Label>
                <Input
                  id="roleName"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., branch_manager"
                />
              </div>
              <div>
                <Label htmlFor="roleDisplayName">Display Name</Label>
                <Input
                  id="roleDisplayName"
                  value={newRoleDisplayName}
                  onChange={(e) => setNewRoleDisplayName(e.target.value)}
                  placeholder="e.g., Branch Manager"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Input
                id="roleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Enter role description"
              />
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2 capitalize">{category.replace("_", " ")}</h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {(categoryPermissions as Permission[]).map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <Label htmlFor={permission.id} className="text-sm">
                            {permission.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingRole(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditingRole} onOpenChange={setIsEditingRole}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-4">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2 capitalize">{category.replace("_", " ")}</h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {(categoryPermissions as Permission[]).map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${permission.id}`}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                            disabled={selectedRole?.is_system}
                          />
                          <Label htmlFor={`edit-${permission.id}`} className="text-sm">
                            {permission.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditingRole(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={selectedRole?.is_system || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
