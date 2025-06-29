"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Database, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SyncStatus {
  last_sync: string
  status: string
  modules: Record<
    string,
    {
      last_sync: string
      status: string
      transactions_synced: number
      errors: number
    }
  >
  total_transactions: number
  total_errors: number
  sync_duration_ms: number
}

interface GLAccount {
  id: string
  code: string
  name: string
  type: string
  category: string
  balance: number
  is_active: boolean
}

export function GLIntegrationDashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/gl/sync-status")
      const data = await response.json()
      setSyncStatus(data.sync_status)
    } catch (error) {
      console.error("Error fetching sync status:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sync status",
        variant: "destructive",
      })
    }
  }

  const fetchGLAccounts = async () => {
    try {
      const response = await fetch("/api/gl/accounts/complete")
      const data = await response.json()
      setGLAccounts(data.accounts)
    } catch (error) {
      console.error("Error fetching GL accounts:", error)
      toast({
        title: "Error",
        description: "Failed to fetch GL accounts",
        variant: "destructive",
      })
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/gl/sync-status", {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        await fetchSyncStatus()
      }
    } catch (error) {
      console.error("Error syncing:", error)
      toast({
        title: "Error",
        description: "Sync failed",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchSyncStatus(), fetchGLAccounts()])
      setIsLoading(false)
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const totalBalance = glAccounts.reduce((sum, account) => {
    return account.type === "Asset" ? sum + account.balance : sum - account.balance
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GL Integration Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage General Ledger integration</p>
        </div>
        <Button onClick={handleManualSync} disabled={isSyncing} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Manual Sync"}
        </Button>
      </div>

      {/* Sync Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus?.total_transactions?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Synced to GL</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            {getStatusIcon(syncStatus?.status || "pending")}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={syncStatus?.status === "success" ? "default" : "destructive"}>
                {syncStatus?.status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Last: {syncStatus?.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{syncStatus?.total_errors}</div>
            <p className="text-xs text-muted-foreground">Across all modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBalance === 0 ? (
                <Badge variant="default">Balanced</Badge>
              ) : (
                <Badge variant="destructive">Unbalanced</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Difference: GH₵{Math.abs(totalBalance).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList>
          <TabsTrigger value="modules">Module Status</TabsTrigger>
          <TabsTrigger value="accounts">GL Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Module Sync Status</CardTitle>
              <CardDescription>Status of each module's GL integration</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Last Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncStatus &&
                    Object.entries(syncStatus.modules).map(([module, data]) => (
                      <TableRow key={module}>
                        <TableCell className="font-medium capitalize">{module.replace("_", " ")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(data.status)}
                            <Badge variant={data.status === "success" ? "default" : "destructive"}>{data.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{data.transactions_synced.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={data.errors > 0 ? "text-red-500" : "text-green-500"}>{data.errors}</span>
                        </TableCell>
                        <TableCell>{new Date(data.last_sync).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>GL Account Balances</CardTitle>
              <CardDescription>Current balances of all GL accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.type}</Badge>
                      </TableCell>
                      <TableCell>{account.category}</TableCell>
                      <TableCell className="text-right font-mono">GH₵{account.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
