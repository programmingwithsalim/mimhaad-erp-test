"use client"

import { SyncBranchesUsers } from "@/components/shared/sync-branches-users"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Users, Building2, RefreshCw } from "lucide-react"

export default function SyncPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data Synchronization</h1>
        <p className="text-muted-foreground">Manage and synchronize data across different modules of the system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SyncBranchesUsers />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Current status of data synchronization across modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Branches</span>
              </div>
              <span className="text-green-600 font-medium">Synced</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </div>
              <span className="text-green-600 font-medium">Synced</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span>Float Accounts</span>
              </div>
              <span className="text-green-600 font-medium">Synced</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
