"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export function PowerIntegrationTester() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testData, setTestData] = useState({
    meterNumber: "12345678",
    provider: "ecg",
    amount: 50,
    customerName: "Test Customer",
  })

  const [branches, setBranches] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [setupLoading, setSetupLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch branches
        const branchResponse = await fetch("/api/branches")
        if (branchResponse.ok) {
          const branchData = await branchResponse.json()
          if (branchData.success && branchData.branches) {
            setBranches(branchData.branches)
            if (branchData.branches.length > 0) {
              setSelectedBranch(branchData.branches[0].id)
            }
          }
        }

        // Fetch users
        const userResponse = await fetch("/api/users")
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.success && userData.users) {
            setUsers(userData.users)
            if (userData.users.length > 0) {
              setSelectedUser(userData.users[0].id)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  const runIntegrationTest = async () => {
    setLoading(true)
    setTestResult(null)

    if (!selectedBranch || !selectedUser) {
      toast({
        title: "Missing Information",
        description: "Please select a branch and user before running the test",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/debug/test-power-integration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...testData,
          branchId: selectedBranch,
          userId: selectedUser,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTestResult(result.data)
        toast({
          title: "Integration Test Successful",
          description: "Power service integration with GL and Audit is working!",
        })
      } else {
        throw new Error(result.error || "Test failed")
      }
    } catch (error) {
      console.error("Integration test failed:", error)
      toast({
        title: "Integration Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const setupPowerAccounts = async () => {
    if (!selectedBranch || !selectedUser) {
      toast({
        title: "Missing Information",
        description: "Please select a branch and user before setting up accounts",
        variant: "destructive",
      })
      return
    }

    setSetupLoading(true)

    try {
      const response = await fetch("/api/debug/setup-power-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branchId: selectedBranch,
          userId: selectedUser,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Setup Successful",
          description: `Created ${result.data.created_accounts} new float accounts`,
        })
      } else {
        throw new Error(result.error || "Setup failed")
      }
    } catch (error) {
      console.error("Setup failed:", error)
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSetupLoading(false)
    }
  }

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Power Service Integration Test</CardTitle>
          <CardDescription>Test the integration of Power services with GL posting and Audit logging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user">User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meter">Meter Number</Label>
                <Input
                  id="meter"
                  value={testData.meterNumber}
                  onChange={(e) => setTestData({ ...testData, meterNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={testData.provider}
                  onValueChange={(value) => setTestData({ ...testData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecg">ECG</SelectItem>
                    <SelectItem value="nedco">NEDCo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GHS)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={testData.amount}
                  onChange={(e) => setTestData({ ...testData, amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer Name</Label>
                <Input
                  id="customer"
                  value={testData.customerName}
                  onChange={(e) => setTestData({ ...testData, customerName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={setupPowerAccounts}
              disabled={setupLoading || !selectedBranch || !selectedUser}
              variant="outline"
              className="flex-1"
            >
              {setupLoading ? "Setting up..." : "Setup Float Accounts"}
            </Button>

            <Button
              onClick={runIntegrationTest}
              disabled={loading || !selectedBranch || !selectedUser}
              className="flex-1"
            >
              {loading ? "Running Test..." : "Run Integration Test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <StatusIcon status={testResult.integration_status.transaction_created} />
                <span>Transaction Created</span>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIcon status={testResult.integration_status.gl_posted} />
                <span>GL Posted</span>
              </div>
              <div className="flex items-center space-x-2">
                <StatusIcon status={testResult.integration_status.audit_logged} />
                <span>Audit Logged</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Transaction Details</h4>
              <div className="bg-muted p-3 rounded">
                <p>
                  <strong>ID:</strong> {testResult.transaction.id}
                </p>
                <p>
                  <strong>Reference:</strong> {testResult.transaction.reference}
                </p>
                <p>
                  <strong>Amount:</strong> GHS {testResult.transaction.amount}
                </p>
                <p>
                  <strong>Status:</strong> <Badge>{testResult.transaction.status}</Badge>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">GL Transactions ({testResult.gl_transactions.length})</h4>
              {testResult.gl_transactions.length > 0 ? (
                <div className="bg-muted p-3 rounded">
                  {testResult.gl_transactions.map((gl: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p>
                        <strong>Account:</strong> {gl.account_code} - {gl.account_name}
                      </p>
                      <p>
                        <strong>Type:</strong> {gl.transaction_type} | <strong>Amount:</strong> GHS {gl.amount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>No GL transactions found</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Audit Logs ({testResult.audit_logs.length})</h4>
              {testResult.audit_logs.length > 0 ? (
                <div className="bg-muted p-3 rounded">
                  {testResult.audit_logs.map((audit: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p>
                        <strong>Action:</strong> {audit.action_type}
                      </p>
                      <p>
                        <strong>Description:</strong> {audit.description}
                      </p>
                      <p>
                        <strong>Severity:</strong> <Badge variant="outline">{audit.severity}</Badge>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>No audit logs found</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
