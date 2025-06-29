"use client"

import { useState } from "react"
import { useFloatStore, type FloatAccount, type FloatRequest } from "@/lib/float-management"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowUpDown, CheckCircle, CircleDollarSign, Download, PlusCircle, Search, XCircle } from "lucide-react"

export default function FloatManagementDashboard() {
  const { toast } = useToast()

  // Get data from the float store
  const floatAccounts = useFloatStore((state) => Object.values(state.floatAccounts))
  const floatRequests = useFloatStore((state) => state.requests)
  const floatTransactions = useFloatStore((state) => state.transactions)
  const updateFloatBalance = useFloatStore((state) => state.updateFloatBalance)
  const upsertFloatAccount = useFloatStore((state) => state.upsertFloatAccount)
  const approveFloatRequest = useFloatStore((state) => state.approveFloatRequest)
  const rejectFloatRequest = useFloatStore((state) => state.rejectFloatRequest)

  // State for UI
  const [searchQuery, setSearchQuery] = useState("")
  const [filterService, setFilterService] = useState("all")
  const [filterBranch, setFilterBranch] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAllocationDialog, setShowAllocationDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<FloatAccount | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<FloatRequest | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [approvalAmount, setApprovalAmount] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  // Form state for new account
  const [newAccountBranch, setNewAccountBranch] = useState("")
  const [newAccountService, setNewAccountService] = useState("")
  const [newAccountProvider, setNewAccountProvider] = useState("")
  const [newAccountBalance, setNewAccountBalance] = useState("")
  const [newAccountMin, setNewAccountMin] = useState("")
  const [newAccountMax, setNewAccountMax] = useState("")

  // Form state for allocation
  const [allocationAccount, setAllocationAccount] = useState("")
  const [allocationAmount, setAllocationAmount] = useState("")
  const [allocationNotes, setAllocationNotes] = useState("")

  // Mock data for branches and services
  const branches = [
    { id: "branch-1", name: "Main Branch" },
    { id: "branch-2", name: "North Branch" },
    { id: "branch-3", name: "East Branch" },
    { id: "branch-4", name: "West Branch" },
  ]

  const services = [
    { type: "momo", name: "Mobile Money", providers: ["MTN", "Vodafone", "AirtelTigo"] },
    { type: "ezwich", name: "E-Zwich", providers: [] },
    { type: "agency", name: "Agency Banking", providers: [] },
    { type: "jumia", name: "Jumia", providers: [] },
    { type: "power", name: "Power", providers: ["VRA", "ECG", "NEDCo"] },
  ]

  // Current user ID (would come from auth in a real app)
  const currentUserId = "user-1"

  // Filter accounts based on search and filters
  const filteredAccounts = floatAccounts.filter((account) => {
    // Filter by service
    if (filterService !== "all" && account.serviceType !== filterService) {
      return false
    }

    // Filter by branch
    if (filterBranch !== "all" && account.branchId !== filterBranch) {
      return false
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const branchName = branches.find((b) => b.id === account.branchId)?.name.toLowerCase() || ""
      const serviceName = services.find((s) => s.type === account.serviceType)?.name.toLowerCase() || ""

      return (
        branchName.includes(query) ||
        serviceName.includes(query) ||
        (account.provider && account.provider.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Filter requests based on search and filters
  const filteredRequests = floatRequests.filter((request) => {
    // Filter by status
    if (filterStatus !== "all" && request.status !== filterStatus) {
      return false
    }

    // Filter by branch
    if (filterBranch !== "all" && request.branchId !== filterBranch) {
      return false
    }

    // Filter by service
    if (filterService !== "all" && request.serviceType !== filterService) {
      return false
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const branchName = branches.find((b) => b.id === request.branchId)?.name.toLowerCase() || ""
      const serviceName = services.find((s) => s.type === request.serviceType)?.name.toLowerCase() || ""

      return (
        branchName.includes(query) ||
        serviceName.includes(query) ||
        (request.provider && request.provider.toLowerCase().includes(query)) ||
        request.reason.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Calculate total float across all accounts
  const totalFloat = floatAccounts.reduce((sum, account) => sum + account.currentBalance, 0)

  // Find accounts with low float (below min threshold)
  const lowFloatAccounts = floatAccounts.filter((account) => account.currentBalance < account.minThreshold)

  // Find accounts with high float (above max threshold)
  const highFloatAccounts = floatAccounts.filter((account) => account.currentBalance > account.maxThreshold)

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Handle creating a new float account
  const handleCreateAccount = () => {
    if (!newAccountBranch || !newAccountService) {
      toast({
        title: "Missing Fields",
        description: "Branch and service type are required.",
        variant: "destructive",
      })
      return
    }

    const balance = Number.parseFloat(newAccountBalance) || 0
    const minThreshold = Number.parseFloat(newAccountMin) || 1000
    const maxThreshold = Number.parseFloat(newAccountMax) || 50000

    if (minThreshold >= maxThreshold) {
      toast({
        title: "Invalid Thresholds",
        description: "Minimum threshold must be less than maximum threshold.",
        variant: "destructive",
      })
      return
    }

    const accountId = `float-${newAccountBranch}-${newAccountService}${newAccountProvider ? `-${newAccountProvider}` : ""}`

    // Check if account already exists
    const existingAccount = floatAccounts.find((a) => a.id === accountId)
    if (existingAccount) {
      toast({
        title: "Account Exists",
        description: "A float account with these details already exists.",
        variant: "destructive",
      })
      return
    }

    // Create new account
    const newAccount: FloatAccount = {
      id: accountId,
      branchId: newAccountBranch,
      serviceType: newAccountService,
      provider: newAccountProvider || undefined,
      currentBalance: balance,
      minThreshold,
      maxThreshold,
      lastUpdated: new Date().toISOString(),
    }

    upsertFloatAccount(newAccount)

    // If initial balance is greater than 0, create a transaction
    if (balance > 0) {
      updateFloatBalance(accountId, balance, {
        branchId: newAccountBranch,
        serviceType: newAccountService,
        provider: newAccountProvider || undefined,
        transactionType: "allocation",
        amount: balance,
        notes: "Initial float allocation",
        performedBy: currentUserId,
      })
    }

    toast({
      title: "Account Created",
      description: "The float account has been created successfully.",
    })

    // Reset form
    setNewAccountBranch("")
    setNewAccountService("")
    setNewAccountProvider("")
    setNewAccountBalance("")
    setNewAccountMin("")
    setNewAccountMax("")
    setShowAccountDialog(false)
  }

  // Handle float allocation
  const handleAllocateFloat = () => {
    if (!allocationAccount) {
      toast({
        title: "No Account Selected",
        description: "Please select a float account.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(allocationAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      })
      return
    }

    const account = floatAccounts.find((a) => a.id === allocationAccount)
    if (!account) {
      toast({
        title: "Account Not Found",
        description: "The selected float account could not be found.",
        variant: "destructive",
      })
      return
    }

    // Update float balance
    updateFloatBalance(account.id, amount, {
      branchId: account.branchId,
      serviceType: account.serviceType,
      provider: account.provider,
      transactionType: "allocation",
      amount,
      notes: allocationNotes || "Manual float allocation",
      performedBy: currentUserId,
    })

    toast({
      title: "Float Allocated",
      description: `${formatCurrency(amount)} has been allocated to the account.`,
    })

    // Reset form
    setAllocationAccount("")
    setAllocationAmount("")
    setAllocationNotes("")
    setShowAllocationDialog(false)
  }

  // Handle approving a float request
  const handleApproveRequest = () => {
    if (!selectedRequest) return

    const amount = Number.parseFloat(approvalAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      })
      return
    }

    approveFloatRequest(selectedRequest.id, currentUserId, amount)

    toast({
      title: "Request Approved",
      description: `The float request has been approved for ${formatCurrency(amount)}.`,
    })

    setApprovalAmount("")
    setSelectedRequest(null)
    setShowApproveDialog(false)
  }

  // Handle rejecting a float request
  const handleRejectRequest = () => {
    if (!selectedRequest) return

    if (!rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting the request.",
        variant: "destructive",
      })
      return
    }

    rejectFloatRequest(selectedRequest.id, currentUserId, rejectionReason)

    toast({
      title: "Request Rejected",
      description: "The float request has been rejected.",
    })

    setRejectionReason("")
    setSelectedRequest(null)
    setShowRejectDialog(false)
  }

  // Get float status
  const getFloatStatus = (account: FloatAccount) => {
    const percentage = (account.currentBalance / account.maxThreshold) * 100

    if (account.currentBalance < account.minThreshold) {
      return { label: "Low", color: "destructive", percentage }
    } else if (account.currentBalance > account.maxThreshold) {
      return { label: "Excess", color: "secondary", percentage: 100 }
    } else {
      return { label: "Healthy", color: "default", percentage }
    }
  }

  // Get request urgency badge
  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge variant="secondary">Medium</Badge>
      default:
        return <Badge variant="outline">Low</Badge>
    }
  }

  // Get request status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            Approved
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  // Export float accounts to CSV
  const exportAccounts = () => {
    const headers = [
      "Branch",
      "Service",
      "Provider",
      "Current Balance",
      "Min Threshold",
      "Max Threshold",
      "Last Updated",
    ]

    const csvRows = [
      headers.join(","),
      ...filteredAccounts.map((account) => {
        const branchName = branches.find((b) => b.id === account.branchId)?.name || account.branchId
        const serviceName = services.find((s) => s.type === account.serviceType)?.name || account.serviceType

        return [
          branchName,
          serviceName,
          account.provider || "N/A",
          account.currentBalance,
          account.minThreshold,
          account.maxThreshold,
          new Date(account.lastUpdated).toLocaleString(),
        ].join(",")
      }),
    ]

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `float_accounts_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export float requests to CSV
  const exportRequests = () => {
    const headers = [
      "ID",
      "Branch",
      "Service",
      "Provider",
      "Requested By",
      "Amount",
      "Reason",
      "Urgency",
      "Status",
      "Request Date",
      "Approved By",
      "Approved Amount",
      "Approval Date",
      "Rejection Reason",
    ]

    const csvRows = [
      headers.join(","),
      ...filteredRequests.map((request) => {
        const branchName = branches.find((b) => b.id === request.branchId)?.name || request.branchId
        const serviceName = services.find((s) => s.type === request.serviceType)?.name || request.serviceType

        return [
          request.id,
          branchName,
          serviceName,
          request.provider || "N/A",
          request.requestedBy,
          request.requestedAmount,
          `"${request.reason.replace(/"/g, '""')}"`,
          request.urgency,
          request.status,
          new Date(request.requestDate).toLocaleString(),
          request.approvedBy || "N/A",
          request.approvedAmount || "N/A",
          request.approvalDate ? new Date(request.approvalDate).toLocaleString() : "N/A",
          request.rejectionReason ? `"${request.rejectionReason.replace(/"/g, '""')}"` : "N/A",
        ].join(",")
      }),
    ]

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `float_requests_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Float Management</h2>
        <div className="flex gap-2">
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogTrigger asChild>
              <Button className="hidden sm:flex">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Float Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Float Account</DialogTitle>
                <DialogDescription>Set up a new float account for a branch and service.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={newAccountBranch} onValueChange={setNewAccountBranch}>
                      <SelectTrigger id="branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service">Service</Label>
                    <Select value={newAccountService} onValueChange={setNewAccountService}>
                      <SelectTrigger id="service">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.type} value={service.type}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newAccountService && services.find((s) => s.type === newAccountService)?.providers.length ? (
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select value={newAccountProvider} onValueChange={setNewAccountProvider}>
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Select provider (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {services
                          .find((s) => s.type === newAccountService)
                          ?.providers.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="initialBalance">Initial Balance (GHS)</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minThreshold">Minimum Threshold (GHS)</Label>
                    <Input
                      id="minThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAccountMin}
                      onChange={(e) => setNewAccountMin(e.target.value)}
                      placeholder="1000.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxThreshold">Maximum Threshold (GHS)</Label>
                    <Input
                      id="maxThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAccountMax}
                      onChange={(e) => setNewAccountMax(e.target.value)}
                      placeholder="50000.00"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAccount}>Create Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="hidden sm:flex">
                <CircleDollarSign className="mr-2 h-4 w-4" />
                Allocate Float
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Allocate Float</DialogTitle>
                <DialogDescription>Add float to an existing account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="account">Float Account</Label>
                  <Select value={allocationAccount} onValueChange={setAllocationAccount}>
                    <SelectTrigger id="account">
                      <SelectValue placeholder="Select float account" />
                    </SelectTrigger>
                    <SelectContent>
                      {floatAccounts.map((account) => {
                        const branchName = branches.find((b) => b.id === account.branchId)?.name || account.branchId
                        const serviceName =
                          services.find((s) => s.type === account.serviceType)?.name || account.serviceType

                        return (
                          <SelectItem key={account.id} value={account.id}>
                            {branchName} - {serviceName} {account.provider ? `(${account.provider})` : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {allocationAccount && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    {(() => {
                      const account = floatAccounts.find((a) => a.id === allocationAccount)
                      if (!account) return null

                      return (
                        <>
                          <div className="flex justify-between">
                            <span>Current Balance:</span>
                            <span className="font-medium">{formatCurrency(account.currentBalance)}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>Min Threshold:</span>
                            <span className="font-medium">{formatCurrency(account.minThreshold)}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>Max Threshold:</span>
                            <span className="font-medium">{formatCurrency(account.maxThreshold)}</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (GHS)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    placeholder="Add any notes about this allocation..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAllocationDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAllocateFloat}>Allocate Float</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" className="sm:hidden">
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="sm:hidden">
            <CircleDollarSign className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Float</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFloat)}</div>
            <p className="text-xs text-muted-foreground">Across {floatAccounts.length} accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Float Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowFloatAccounts.length}</div>
            <p className="text-xs text-muted-foreground">Accounts below minimum threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{floatRequests.filter((r) => r.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts or requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 md:w-[300px]"
        />
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Float Accounts</TabsTrigger>
          <TabsTrigger value="requests">Float Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Float Accounts</CardTitle>
              <CardDescription>Manage float accounts across branches and services.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Select defaultValue="all" value={filterService} onValueChange={setFilterService}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.type} value={service.type}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select defaultValue="all" value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={exportAccounts}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => {}}
                          className="flex items-center gap-1 p-0 hover:bg-transparent"
                        >
                          Branch
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => {}}
                          className="flex items-center gap-1 p-0 hover:bg-transparent"
                        >
                          Service
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No float accounts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => {
                        const branchName = branches.find((b) => b.id === account.branchId)?.name || account.branchId
                        const serviceName =
                          services.find((s) => s.type === account.serviceType)?.name || account.serviceType
                        const status = getFloatStatus(account)

                        return (
                          <TableRow key={account.id}>
                            <TableCell>{branchName}</TableCell>
                            <TableCell>{serviceName}</TableCell>
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
                            <TableCell>{formatDate(account.lastUpdated)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAccount(account)
                                  setAllocationAccount(account.id)
                                  setShowAllocationDialog(true)
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

        <TabsContent value="requests">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Float Requests</CardTitle>
              <CardDescription>Manage and approve float allocation requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Select defaultValue="all" value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="all" value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={exportRequests}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => {}}
                          className="flex items-center gap-1 p-0 hover:bg-transparent"
                        >
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No float requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRequests.map((request) => {
                        const branchName = branches.find((b) => b.id === request.branchId)?.name || request.branchId
                        const serviceName =
                          services.find((s) => s.type === request.serviceType)?.name || request.serviceType

                        return (
                          <TableRow key={request.id}>
                            <TableCell>{formatDate(request.requestDate)}</TableCell>
                            <TableCell>{branchName}</TableCell>
                            <TableCell>
                              {serviceName} {request.provider ? `(${request.provider})` : ""}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(request.requestedAmount)}</TableCell>
                            <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={request.reason}>
                              {request.reason}
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "pending" ? (
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => {
                                      setSelectedRequest(request)
                                      setApprovalAmount(request.requestedAmount.toString())
                                      setShowApproveDialog(true)
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => {
                                      setSelectedRequest(request)
                                      setShowRejectDialog(true)
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                  }}
                                >
                                  View
                                </Button>
                              )}
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
      </Tabs>

      {/* Approve Request Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Approve Float Request</DialogTitle>
            <DialogDescription>Review and approve the float allocation request.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Branch:</div>
                  <div>{branches.find((b) => b.id === selectedRequest.branchId)?.name}</div>
                  <div className="font-medium">Service:</div>
                  <div>
                    {services.find((s) => s.type === selectedRequest.serviceType)?.name}
                    {selectedRequest.provider ? ` (${selectedRequest.provider})` : ""}
                  </div>
                  <div className="font-medium">Requested Amount:</div>
                  <div>{formatCurrency(selectedRequest.requestedAmount)}</div>
                  <div className="font-medium">Urgency:</div>
                  <div>{selectedRequest.urgency.charAt(0).toUpperCase() + selectedRequest.urgency.slice(1)}</div>
                  <div className="font-medium">Reason:</div>
                  <div>{selectedRequest.reason}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalAmount">Approval Amount (GHS)</Label>
                <Input
                  id="approvalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveRequest}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Float Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this float request.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Branch:</div>
                  <div>{branches.find((b) => b.id === selectedRequest.branchId)?.name}</div>
                  <div className="font-medium">Service:</div>
                  <div>
                    {services.find((s) => s.type === selectedRequest.serviceType)?.name}
                    {selectedRequest.provider ? ` (${selectedRequest.provider})` : ""}
                  </div>
                  <div className="font-medium">Requested Amount:</div>
                  <div>{formatCurrency(selectedRequest.requestedAmount)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
