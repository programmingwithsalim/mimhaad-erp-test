"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useRealtimeTransactions } from "@/hooks/use-realtime-transactions"
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Smartphone,
  Banknote,
  CreditCard,
  Zap,
  ShoppingCart,
  Eye,
  MessageSquare,
  Phone,
} from "lucide-react"
import { format } from "date-fns"

interface ServiceStats {
  service: string
  transactions: number
  volume: number
  commission: number
}

interface TotalStats {
  totalTransactions: number
  totalVolume: number
  totalCommission: number
  todayTransactions: number
  todayVolume: number
  todayCommission: number
}

interface EnhancedCashierDashboardProps {
  serviceStats: ServiceStats[]
  totalStats: TotalStats
}

export function EnhancedCashierDashboard({
  serviceStats,
  totalStats,
}: EnhancedCashierDashboardProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [showTransactionDetail, setShowTransactionDetail] = useState(false)
  const [showMarkDeliveredDialog, setShowMarkDeliveredDialog] = useState(false)
  const [showSendSMSDialog, setShowSendSMSDialog] = useState(false)
  const [processingTransaction, setProcessingTransaction] = useState<string | null>(null)
  const [smsMessage, setSmsMessage] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  // Real-time transactions hook
  const {
    transactions,
    loading,
    error,
    lastUpdate,
    isRefreshing: isRefreshingTransactions,
    refresh,
    updateTransactionStatus,
  } = useRealtimeTransactions({
    branchId: user?.branchId,
    limit: 100,
    autoRefresh: true,
    refreshInterval: 3000, // 3 seconds
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    refresh()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return <Smartphone className="h-4 w-4" />
      case "agency_banking":
      case "agency banking":
        return <Banknote className="h-4 w-4" />
      case "e_zwich":
      case "e-zwich":
        return <CreditCard className="h-4 w-4" />
      case "power":
        return <Zap className="h-4 w-4" />
      case "jumia":
        return <ShoppingCart className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getServiceColor = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return "text-blue-600"
      case "agency_banking":
      case "agency banking":
        return "text-green-600"
      case "e_zwich":
      case "e-zwich":
        return "text-purple-600"
      case "power":
        return "text-yellow-600"
      case "jumia":
        return "text-orange-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetail(true)
  }

  const handleMarkDelivered = async (transactionId: string) => {
    setProcessingTransaction(transactionId)
    updateTransactionStatus(transactionId, "processing")

    try {
      const response = await fetch(`/api/transactions/${transactionId}/mark-delivered`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
        }),
      })

      if (response.ok) {
        updateTransactionStatus(transactionId, "completed")
        toast({
          title: "Transaction Updated",
          description: "Transaction marked as delivered successfully",
        })
      } else {
        updateTransactionStatus(transactionId, "pending")
        throw new Error("Failed to mark as delivered")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark transaction as delivered",
        variant: "destructive",
      })
    } finally {
      setProcessingTransaction(null)
    }
  }

  const handleSendSMS = async (transactionId: string) => {
    if (!smsMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      })
      return
    }

    setProcessingTransaction(transactionId)
    updateTransactionStatus(transactionId, "processing")

    try {
      const response = await fetch(`/api/transactions/${transactionId}/send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: smsMessage,
          userId: user?.id,
        }),
      })

      if (response.ok) {
        toast({
          title: "SMS Sent",
          description: "SMS notification sent successfully",
        })
        setSmsMessage("")
        setShowSendSMSDialog(false)
      } else {
        throw new Error("Failed to send SMS")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS notification",
        variant: "destructive",
      })
    } finally {
      setProcessingTransaction(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount)
  }

  const formatPhoneNumber = (phone: string) => {
    // Add Ghana country code if not present
    if (phone && !phone.startsWith("+233")) {
      return phone.startsWith("0") ? `+233${phone.slice(1)}` : `+233${phone}`
    }
    return phone
  }

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === "all") return true
    return tx.service_type.toLowerCase() === activeTab.toLowerCase()
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cashier Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time transaction monitoring and management
            {lastUpdate && (
              <span className="ml-2 text-xs">
                Last updated: {format(lastUpdate, "HH:mm:ss")}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing || isRefreshingTransactions}
          variant="outline"
          className="gap-2"
        >
          {(isRefreshing || isRefreshingTransactions) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Service Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {serviceStats.map((stat) => (
          <Card key={stat.service}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.service.replace(/_/g, " ").toUpperCase()}
              </CardTitle>
              <div className={getServiceColor(stat.service)}>
                {getServiceIcon(stat.service)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.transactions}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stat.volume)} volume
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalStats.todayVolume)} volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalVolume)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalStats.todayCommission)} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Live transaction updates - refreshing every 3 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-4 text-red-600">
              <p>{error}</p>
              <Button onClick={refresh} variant="outline" className="mt-2">
                Retry
              </Button>
            </div>
          )}

          {loading && transactions.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="momo">MoMo</TabsTrigger>
                <TabsTrigger value="agency_banking">Agency</TabsTrigger>
                <TabsTrigger value="e_zwich">E-Zwich</TabsTrigger>
                <TabsTrigger value="power">Power</TabsTrigger>
                <TabsTrigger value="jumia">Jumia</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(transaction.created_at), "HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getServiceIcon(transaction.service_type)}
                              <span className="capitalize">
                                {transaction.service_type.replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {transaction.customer_name || "N/A"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatPhoneNumber(transaction.phone_number || "")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatCurrency(transaction.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Fee: {formatCurrency(transaction.fee)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTransaction(transaction)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {transaction.status === "pending" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleMarkDelivered(transaction.id)}
                                    disabled={processingTransaction === transaction.id}
                                  >
                                    {processingTransaction === transaction.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Mark Delivered
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTransaction(transaction)
                                  setShowSendSMSDialog(true)
                                }}>
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Send SMS
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  // Handle call customer
                                  if (transaction.phone_number) {
                                    window.open(`tel:${formatPhoneNumber(transaction.phone_number)}`)
                                  }
                                }}>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Call Customer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={showTransactionDetail} onOpenChange={setShowTransactionDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed information about the transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <p className="text-sm font-mono">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label>Reference</Label>
                  <p className="text-sm">{selectedTransaction.reference || "N/A"}</p>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <p className="text-sm">{selectedTransaction.customer_name || "N/A"}</p>
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <p className="text-sm">{formatPhoneNumber(selectedTransaction.phone_number || "")}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <Label>Fee</Label>
                  <p className="text-sm">{formatCurrency(selectedTransaction.fee)}</p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="text-sm capitalize">{selectedTransaction.service_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <Label>Created At</Label>
                  <p className="text-sm">{format(new Date(selectedTransaction.created_at), "PPpp")}</p>
                </div>
                <div>
                  <Label>Updated At</Label>
                  <p className="text-sm">{format(new Date(selectedTransaction.updated_at), "PPpp")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send SMS Dialog */}
      <Dialog open={showSendSMSDialog} onOpenChange={setShowSendSMSDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS Notification</DialogTitle>
            <DialogDescription>
              Send a custom SMS message to the customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                placeholder="Enter your message here..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
              />
            </div>
            {selectedTransaction && (
              <div className="text-sm text-muted-foreground">
                <p>To: {formatPhoneNumber(selectedTransaction.phone_number || "")}</p>
                <p>Customer: {selectedTransaction.customer_name || "N/A"}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSendSMSDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedTransaction && handleSendSMS(selectedTransaction.id)}
              disabled={!smsMessage.trim() || processingTransaction === selectedTransaction?.id}
            >
              {processingTransaction === selectedTransaction?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send SMS"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
