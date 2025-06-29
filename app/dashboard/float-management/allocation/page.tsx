"use client"

import { useState } from "react"
import { useFloatStore } from "@/lib/float-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowUpDown, PlusCircle, Search } from "lucide-react"
import { FloatAllocationForm } from "@/components/float-management/float-allocation-form"
import { FloatAllocationHistory } from "@/components/float-management/float-allocation-history"
import { FloatAllocationBulkForm } from "@/components/float-management/float-allocation-bulk-form"
import { FloatAllocationSummary } from "@/components/float-management/float-allocation-summary"

export default function FloatAllocationPage() {
  const { toast } = useToast()
  const floatAccounts = useFloatStore((state) => Object.values(state.floatAccounts))
  const updateFloatBalance = useFloatStore((state) => state.updateFloatBalance)

  const [searchQuery, setSearchQuery] = useState("")
  const [showAllocationForm, setShowAllocationForm] = useState(false)
  const [showBulkAllocationForm, setShowBulkAllocationForm] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("accounts")

  // Current user ID (would come from auth in a real app)
  const currentUserId = "user-1"

  // Filter accounts based on search
  const filteredAccounts = floatAccounts.filter((account) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      account.branchId.toLowerCase().includes(query) ||
      account.serviceType.toLowerCase().includes(query) ||
      (account.provider && account.provider.toLowerCase().includes(query))
    )
  })

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })
  }

  // Handle allocation submission
  const handleAllocationSubmit = (data: any) => {
    const { accountId, amount, notes } = data
    const account = floatAccounts.find((a) => a.id === accountId)

    if (!account) {
      toast({
        title: "Error",
        description: "Selected account not found",
        variant: "destructive",
      })
      return
    }

    // Ensure amount is a number
    const numAmount = Number(amount)

    // Update float balance
    updateFloatBalance(account.id, numAmount, {
      branchId: account.branchId,
      serviceType: account.serviceType,
      provider: account.provider,
      transactionType: "allocation",
      amount: numAmount,
      notes: notes || "Manual float allocation",
      performedBy: currentUserId,
    })

    toast({
      title: "Float Allocated",
      description: `${formatCurrency(numAmount)} has been allocated to the account.`,
    })

    setShowAllocationForm(false)
  }

  // Handle bulk allocation submission
  const handleBulkAllocationSubmit = (allocations: any[]) => {
    allocations.forEach((allocation) => {
      const { accountId, amount, notes } = allocation
      const account = floatAccounts.find((a) => a.id === accountId)

      if (!account || amount <= 0) return

      // Update float balance
      updateFloatBalance(account.id, amount, {
        branchId: account.branchId,
        serviceType: account.serviceType,
        provider: account.provider,
        transactionType: "allocation",
        amount,
        notes: notes || "Bulk float allocation",
        performedBy: currentUserId,
      })
    })

    toast({
      title: "Bulk Allocation Complete",
      description: `Float has been allocated to multiple accounts.`,
    })

    setShowBulkAllocationForm(false)
  }

  // Get float status
  const getFloatStatus = (account: any) => {
    const percentage = (account.currentBalance / account.maxThreshold) * 100

    if (account.currentBalance < account.minThreshold) {
      return { label: "Low", color: "destructive", percentage }
    } else if (account.currentBalance > account.maxThreshold) {
      return { label: "Excess", color: "secondary", percentage: 100 }
    } else {
      return { label: "Healthy", color: "default", percentage }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Float Allocation</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setShowAllocationForm(true)
              setShowBulkAllocationForm(false)
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Single Allocation
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowBulkAllocationForm(true)
              setShowAllocationForm(false)
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Bulk Allocation
          </Button>
        </div>
      </div>

      <FloatAllocationSummary floatAccounts={floatAccounts} />

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 md:w-[300px]"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="history">Allocation History</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Float Accounts</CardTitle>
              <CardDescription>Allocate float to accounts across branches and services.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" className="flex items-center gap-1 p-0 hover:bg-transparent">
                          Branch
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" className="flex items-center gap-1 p-0 hover:bg-transparent">
                          Service
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No float accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => {
                        const status = getFloatStatus(account)

                        return (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.branchId}</TableCell>
                            <TableCell>{account.serviceType}</TableCell>
                            <TableCell>{account.provider || "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(account.currentBalance)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <Badge variant={status.color as any}>{status.label}</Badge>
                                  <span className="text-xs font-medium">{Math.round(status.percentage)}%</span>
                                </div>
                                <Progress value={status.percentage} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log("Allocate button clicked for account:", account.id)
                                  setSelectedAccountId(account.id)
                                  setShowAllocationForm(true)
                                  setShowBulkAllocationForm(false)
                                }}
                              >
                                Allocate
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <FloatAllocationHistory />
        </TabsContent>
      </Tabs>

      {showAllocationForm && (
        <Card>
          <CardHeader>
            <CardTitle>Allocate Float</CardTitle>
            <CardDescription>Add float to an account</CardDescription>
          </CardHeader>
          <CardContent>
            <FloatAllocationForm
              branches={[]}
              onSubmit={handleAllocationSubmit}
              onCancel={() => setShowAllocationForm(false)}
              selectedAccountId={selectedAccountId}
              floatAccounts={floatAccounts}
            />
          </CardContent>
        </Card>
      )}

      {showBulkAllocationForm && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Float Allocation</CardTitle>
            <CardDescription>Allocate float to multiple accounts at once</CardDescription>
          </CardHeader>
          <CardContent>
            <FloatAllocationBulkForm
              onSubmit={handleBulkAllocationSubmit}
              onCancel={() => setShowBulkAllocationForm(false)}
              floatAccounts={floatAccounts}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
