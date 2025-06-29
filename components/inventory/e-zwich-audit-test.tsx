"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { FileText, Database, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

interface AuditLog {
  id: string
  user_id: string
  username: string
  action_type: string
  entity_type: string
  entity_id: string
  description: string
  details: any
  severity: string
  branch_id: string
  status: string
  created_at: string
}

interface GLEntry {
  id: string
  reference_number: string
  description: string
  transaction_date: string
  source_type: string
  source_id: string
  total_debit: number
  total_credit: number
  status: string
  created_at: string
}

export function EZwichAuditTest() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [glEntries, setGLEntries] = useState<GLEntry[]>([])
  const [loading, setLoading] = useState(false)

  const branchId = user?.branchId || "branch-1"
  const userId = user?.id || "admin"

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/audit-logs?entityType=ezwich_batch&branchId=${branchId}&limit=10`)
      const result = await response.json()

      if (result.success) {
        setAuditLogs(result.data || [])
        toast({
          title: "Audit Logs Fetched",
          description: `Found ${result.data?.length || 0} audit log entries`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch audit logs",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchGLEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/gl/journal-entries?sourceType=ezwich_batch&branchId=${branchId}&limit=10`)
      const result = await response.json()

      if (result.success) {
        setGLEntries(result.data || [])
        toast({
          title: "GL Entries Fetched",
          description: `Found ${result.data?.length || 0} GL journal entries`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch GL entries",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching GL entries:", error)
      toast({
        title: "Error",
        description: "Failed to fetch GL entries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateIntegration = async () => {
    try {
      setLoading(true)

      // Test batch creation with audit and GL
      const testBatch = {
        batch_code: `TEST-${Date.now()}`,
        quantity_received: 10,
        card_type: "standard",
        expiry_date: "2025-12-31",
        notes: "Test batch for validation",
        userId,
        branchId,
        created_by: userId,
      }

      const response = await fetch("/api/e-zwich/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testBatch),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Integration Test Passed",
          description: "Test batch created with audit logging and GL posting",
        })

        // Fetch updated logs
        await fetchAuditLogs()
        await fetchGLEntries()
      } else {
        toast({
          title: "Integration Test Failed",
          description: result.error || "Failed to create test batch",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in integration test:", error)
      toast({
        title: "Integration Test Failed",
        description: "An error occurred during testing",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const config = {
      low: { variant: "secondary" as const, color: "text-blue-600" },
      medium: { variant: "default" as const, color: "text-yellow-600" },
      high: { variant: "destructive" as const, color: "text-red-600" },
      critical: { variant: "destructive" as const, color: "text-red-800" },
    }

    const { variant } = config[severity as keyof typeof config] || config.low
    return <Badge variant={variant}>{severity.toUpperCase()}</Badge>
  }

  const getStatusBadge = (status: string) => {
    return status === "success" ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit & GL Integration Testing
          </CardTitle>
          <CardDescription>
            Test and validate audit logging and GL posting functionality for E-Zwich card batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={fetchAuditLogs} disabled={loading}>
              <FileText className="h-4 w-4 mr-2" />
              Fetch Audit Logs
            </Button>
            <Button onClick={fetchGLEntries} disabled={loading}>
              <Database className="h-4 w-4 mr-2" />
              Fetch GL Entries
            </Button>
            <Button onClick={validateIntegration} disabled={loading} variant="outline">
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Run Integration Test
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Audit Logs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Audit Logs</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No audit logs found. Click "Fetch Audit Logs" to load.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{log.action_type}</span>
                        <div className="flex gap-2">
                          {getSeverityBadge(log.severity)}
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.description}</p>
                      <div className="text-xs text-muted-foreground">
                        <div>User: {log.username}</div>
                        <div>Time: {new Date(log.created_at).toLocaleString()}</div>
                        {log.details && (
                          <div className="mt-1">
                            <details className="cursor-pointer">
                              <summary>View Details</summary>
                              <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GL Entries */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent GL Entries</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {glEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No GL entries found. Click "Fetch GL Entries" to load.
                  </p>
                ) : (
                  glEntries.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{entry.reference_number}</span>
                        <Badge variant="outline">{entry.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Debit: </span>
                          GHS {Number(entry.total_debit).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Credit: </span>
                          GHS {Number(entry.total_credit).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>Date: {new Date(entry.transaction_date).toLocaleDateString()}</div>
                        <div>Created: {new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
