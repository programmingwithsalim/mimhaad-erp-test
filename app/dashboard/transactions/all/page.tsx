"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Filter,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  FileText,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { useAllTransactions } from "@/hooks/use-all-transactions"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useBranches } from "@/hooks/use-branches"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function AllTransactionsPage() {
  const {
    transactions,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    clearFilters,
    refetch,
    goToPage,
    nextPage,
    prevPage,
    canViewAllBranches,
    isFiltered,
  } = useAllTransactions()

  const { user } = useCurrentUser()
  const { branches } = useBranches()

  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "successful":
      case "success":
        return "bg-green-100 text-green-800"
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
      case "error":
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getServiceColor = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return "bg-blue-100 text-blue-800"
      case "agency banking":
        return "bg-purple-100 text-purple-800"
      case "e-zwich":
        return "bg-green-100 text-green-800"
      case "power":
        return "bg-yellow-100 text-yellow-800"
      case "jumia":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleDateFromSelect = (date: Date | undefined) => {
    setDateFrom(date)
    updateFilters({ dateFrom: date ? format(date, "yyyy-MM-dd") : "" })
  }

  const handleDateToSelect = (date: Date | undefined) => {
    setDateTo(date)
    updateFilters({ dateTo: date ? format(date, "yyyy-MM-dd") : "" })
  }

  const handleClearFilters = () => {
    clearFilters()
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetail(true)
  }

  const exportTransactions = () => {
    const headers = [
      "Date",
      "Service",
      "Customer",
      "Phone",
      "Type",
      "Amount",
      "Fee",
      "Status",
      "Reference",
      "Provider",
      "Branch",
    ]

    const csvContent = [
      headers.join(","),
      ...transactions.map((tx) =>
        [
          format(new Date(tx.created_at), "MMM dd, yyyy HH:mm"),
          tx.service_type,
          `"${tx.customer_name || "N/A"}"`,
          tx.phone_number || "N/A",
          tx.type,
          tx.amount.toLocaleString(),
          tx.fee.toLocaleString(),
          tx.status,
          `"${tx.reference || "N/A"}"`,
          tx.provider || "N/A",
          tx.branch_id || "N/A",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `all-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <p className="text-muted-foreground">
            {canViewAllBranches
              ? "View and search all transactions across all services and branches"
              : "View and search all transactions for your branch across all services"}
          </p>
          {!canViewAllBranches && (
            <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700">
              Showing transactions for your branch only
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Search & Filters</CardTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} active</Badge>}
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or phone number..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Service Filter */}
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={filters.service} onValueChange={(value) => updateFilters({ service: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All services</SelectItem>
                    <SelectItem value="momo">MoMo</SelectItem>
                    <SelectItem value="agency-banking">Agency Banking</SelectItem>
                    <SelectItem value="e-zwich">E-Zwich</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="jumia">Jumia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filters.type} onValueChange={(value) => updateFilters({ type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="cash-in">Cash In</SelectItem>
                    <SelectItem value="cash-out">Cash Out</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Filter (Admin only) */}
              {canViewAllBranches && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={filters.branchId} onValueChange={(value) => updateFilters({ branchId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date From */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={handleDateToSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Showing {transactions.length} of {pagination.totalCount} transactions
                </span>
              </div>
              {loading && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>All transactions across services {!canViewAllBranches && "for your branch"}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions found</h3>
              <p className="text-muted-foreground mb-4">
                {activeFiltersCount > 0
                  ? "Try adjusting your filters to see more results"
                  : "No transactions have been recorded yet"}
              </p>
              {activeFiltersCount > 0 && (
                <Button onClick={handleClearFilters} variant="outline">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Provider</TableHead>
                      {canViewAllBranches && <TableHead>Branch</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={`${transaction.service_type}-${transaction.id}`}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge className={getServiceColor(transaction.service_type)}>
                            {transaction.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.customer_name || "N/A"}</TableCell>
                        <TableCell className="font-mono">{transaction.phone_number || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">₵{transaction.amount.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">₵{transaction.fee.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{transaction.reference || "N/A"}</TableCell>
                        <TableCell>{transaction.provider || "N/A"}</TableCell>
                        {canViewAllBranches && <TableCell>{transaction.branch_id || "N/A"}</TableCell>}
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewTransaction(transaction)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{" "}
                    {pagination.totalCount} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={!pagination.hasPrevPage || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.currentPage - 2) + i
                        if (pageNum > pagination.totalPages) return null

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={!pagination.hasNextPage || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {/* Transaction Detail Dialog */}
      <Dialog open={showTransactionDetail} onOpenChange={setShowTransactionDetail}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Complete transaction information</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Transaction ID</Label>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Service</Label>
                  <p className="text-sm">{selectedTransaction.service_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm">{selectedTransaction.customer_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm">{selectedTransaction.phone_number || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm">₵{selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fee</Label>
                  <p className="text-sm">₵{selectedTransaction.fee.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">{selectedTransaction.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm">{format(new Date(selectedTransaction.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reference</Label>
                  <p className="text-sm">{selectedTransaction.reference || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Provider</Label>
                  <p className="text-sm">{selectedTransaction.provider || "N/A"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
