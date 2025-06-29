"use client"

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  Filter,
  RefreshCw,
  Search,
  User,
  Shield,
  Activity,
  Database,
  Settings,
  Download,
  Clock,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/gl-accounting/date-range-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { ActionTypeFilter } from "./action-type-filter"
import { EntityTypeFilter } from "./entity-type-filter"
import { SeverityFilter } from "./severity-filter"
import { StatusFilter } from "./status-filter"
import { BranchFilter } from "./branch-filter"
import { UserFilter } from "./user-filter"
import { toast } from "@/components/ui/use-toast"

type AuditLog = {
  id: string
  timestamp: string
  userId: string
  username: string
  actionType: string
  entityType: string
  entityId: string
  description: string
  details?: any
  severity: string
  status: string
  branchId: string
  branchName?: string
  ipAddress?: string
  userAgent?: string
  errorMessage?: string
}

type AuditStatistics = {
  totalLogs: number
  criticalEvents: number
  failedActions: number
  activeUsers: number
  recentActivity: Array<{
    id: string
    username: string
    actionType: string
    entityType: string
    description: string
    severity: string
    status: string
    timestamp: string
  }>
  severityBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  actionTypeBreakdown: Record<string, number>
  dailyActivity: Array<{
    date: string
    total: number
    critical: number
    failures: number
  }>
}

export function AuditTrailDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Individual filter states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([])
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<("success" | "failure")[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // Fetch statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoadingStats(true)
        const response = await fetch("/api/audit-logs/statistics")
        const data = await response.json()

        if (data.success) {
          setStatistics(data.data)
        } else {
          console.error("Failed to fetch statistics:", data.error)
        }
      } catch (error) {
        console.error("Error fetching statistics:", error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchStatistics()
  }, [])

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true)
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
        })

        // Add filters to query params
        if (selectedUsers.length > 0) {
          queryParams.set("userId", selectedUsers.join(","))
        }
        if (selectedActionTypes.length > 0) {
          queryParams.set("actionType", selectedActionTypes.join(","))
        }
        if (selectedEntityTypes.length > 0) {
          queryParams.set("entityType", selectedEntityTypes.join(","))
        }
        if (selectedSeverities.length > 0) {
          queryParams.set("severity", selectedSeverities.join(","))
        }
        if (selectedStatuses.length > 0) {
          queryParams.set("status", selectedStatuses.join(","))
        }
        if (selectedBranches.length > 0) {
          queryParams.set("branchId", selectedBranches.join(","))
        }
        if (searchTerm.trim()) {
          queryParams.set("searchTerm", searchTerm.trim())
        }
        if (dateRange?.from) {
          queryParams.set("startDate", format(dateRange.from, "yyyy-MM-dd"))
        }
        if (dateRange?.to) {
          queryParams.set("endDate", format(dateRange.to, "yyyy-MM-dd"))
        }

        const response = await fetch(`/api/audit-logs?${queryParams}`)
        const data = await response.json()

        if (data.success) {
          const logs = data.logs || []
          setAuditLogs(logs)
          setTotalItems(data.total || 0)
        } else {
          console.error("Failed to fetch audit logs:", data.error)
          setAuditLogs([])
          setTotalItems(0)
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error)
        setAuditLogs([])
        setTotalItems(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditLogs()
  }, [
    currentPage,
    pageSize,
    selectedUsers,
    selectedActionTypes,
    selectedEntityTypes,
    selectedSeverities,
    selectedStatuses,
    selectedBranches,
    searchTerm,
    dateRange,
  ])

  const hasActiveFilters = () => {
    return (
      selectedUsers.length > 0 ||
      selectedActionTypes.length > 0 ||
      selectedEntityTypes.length > 0 ||
      selectedSeverities.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedBranches.length > 0 ||
      searchTerm.trim() ||
      dateRange?.from ||
      dateRange?.to
    )
  }

  const clearAllFilters = () => {
    setSelectedUsers([])
    setSelectedActionTypes([])
    setSelectedEntityTypes([])
    setSelectedSeverities([])
    setSelectedStatuses([])
    setSelectedBranches([])
    setSearchTerm("")
    setDateRange(undefined)
    setCurrentPage(1)
  }

  const seedSampleData = async () => {
    try {
      const response = await fetch("/api/audit-logs/seed", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to seed sample data:", error)
    }
  }

  const refreshData = async () => {
    // Refresh both statistics and audit logs
    window.location.reload()
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size: string) => {
    setPageSize(Number.parseInt(size))
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    setCurrentPage(1)
  }

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("login") || actionType.includes("logout")) {
      return <User className="h-4 w-4" />
    }
    if (actionType.includes("transaction")) {
      return <Activity className="h-4 w-4" />
    }
    if (actionType.includes("float")) {
      return <Database className="h-4 w-4" />
    }
    return <Settings className="h-4 w-4" />
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: "destructive",
      high: "destructive",
      medium: "secondary",
      low: "outline",
    } as const

    return (
      <Badge variant={variants[severity as keyof typeof variants] || "outline"} className="capitalize">
        {severity}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "success" ? "default" : "destructive"} className="capitalize">
        {status}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: format(date, "MMM dd, yyyy"),
      time: format(date, "HH:mm:ss"),
    }
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  const exportAuditLogs = () => {
    try {
      if (!Array.isArray(auditLogs) || auditLogs.length === 0) {
        toast({
          title: "No Data",
          description: "No audit logs available to export",
          variant: "destructive",
        })
        return
      }

      const headers = ["Date", "User", "Action", "Entity", "Description", "Status", "Severity", "IP Address"]
      let csvContent = headers.join(",") + "\n"

      auditLogs.forEach((log) => {
        const row = [
          `"${formatTimestamp(log.timestamp).date} ${formatTimestamp(log.timestamp).time}"`,
          `"${log.username || ""}"`,
          `"${log.actionType || ""}"`,
          `"${log.entityType || ""}"`,
          `"${(log.description || "").replace(/"/g, '""')}"`,
          `"${log.status || ""}"`,
          `"${log.severity || ""}"`,
          `"${log.ipAddress || ""}"`,
        ]
        csvContent += row.join(",") + "\n"
      })

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `audit-logs-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Exported ${auditLogs.length} audit log entries`,
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export audit logs",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">Monitor and track all system activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportAuditLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.totalLogs || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{statistics?.criticalEvents || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{statistics?.failedActions || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">{statistics?.activeUsers || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Severity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Severity Breakdown</CardTitle>
              <CardDescription>Distribution of log entries by severity level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(statistics.severityBreakdown).map(([severity, count]) => {
                const total = Object.values(statistics.severityBreakdown).reduce((a, b) => a + b, 0)
                const percentage = total > 0 ? (count / total) * 100 : 0
                return (
                  <div key={severity} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium">{severity}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Top Action Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Action Types</CardTitle>
              <CardDescription>Most frequent actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(statistics.actionTypeBreakdown)
                  .slice(0, 5)
                  .map(([actionType, count]) => {
                    const total = Object.values(statistics.actionTypeBreakdown).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={actionType} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getActionIcon(actionType)}
                          <span className="capitalize font-medium">{actionType.replace("_", " ")}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{count}</div>
                          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {statistics?.recentActivity && statistics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest audit log entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {activity.username?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(activity.actionType)}
                      <span className="font-medium">{activity.username}</span>
                      <span className="text-sm text-muted-foreground">{activity.actionType.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSeverityBadge(activity.severity)}
                    {getStatusBadge(activity.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(activity.timestamp), "HH:mm")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            <div className="flex items-center space-x-2">
              {hasActiveFilters() && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search audit logs..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <DateRangePicker onDateRangeChange={handleDateRangeChange} />
          </div>

          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <UserFilter selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} />
              <ActionTypeFilter
                selectedActionTypes={selectedActionTypes}
                setSelectedActionTypes={setSelectedActionTypes}
              />
              <EntityTypeFilter
                selectedEntityTypes={selectedEntityTypes}
                setSelectedEntityTypes={setSelectedEntityTypes}
              />
              <SeverityFilter selectedSeverities={selectedSeverities} setSelectedSeverities={setSelectedSeverities} />
              <StatusFilter selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses} />
              <BranchFilter selectedBranches={selectedBranches} setSelectedBranches={setSelectedBranches} />
            </div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters() && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
              {selectedUsers.length > 0 && <Badge variant="secondary">Users: {selectedUsers.length}</Badge>}
              {selectedActionTypes.length > 0 && (
                <Badge variant="secondary">Actions: {selectedActionTypes.length}</Badge>
              )}
              {selectedEntityTypes.length > 0 && (
                <Badge variant="secondary">Entities: {selectedEntityTypes.length}</Badge>
              )}
              {selectedSeverities.length > 0 && (
                <Badge variant="secondary">Severity: {selectedSeverities.length}</Badge>
              )}
              {selectedStatuses.length > 0 && <Badge variant="secondary">Status: {selectedStatuses.length}</Badge>}
              {selectedBranches.length > 0 && <Badge variant="secondary">Branches: {selectedBranches.length}</Badge>}
              {searchTerm && <Badge variant="secondary">Search: "{searchTerm}"</Badge>}
              {dateRange?.from && <Badge variant="secondary">Date Range</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Showing {auditLogs.length} of {totalItems} audit log entries
            {hasActiveFilters() && " (filtered)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User & Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((entry) => {
                    const { date, time } = formatTimestamp(entry.timestamp)
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/50 group">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {entry.username?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{entry.username}</div>
                              <div className="text-xs text-muted-foreground">{date}</div>
                              <div className="text-xs text-muted-foreground">{time}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getActionIcon(entry.actionType)}
                            <span className="font-medium capitalize">{entry.actionType.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {entry.entityType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate">{entry.description}</p>
                            {entry.branchName && (
                              <p className="text-xs text-muted-foreground">Branch: {entry.branchName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                  console.log("Viewing audit log details:", entry.id)
                                  setSelectedLog(entry)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Audit Log Details</DialogTitle>
                                <DialogDescription>Detailed information about this audit log entry</DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium">User Information</h4>
                                      <p className="text-sm text-muted-foreground">Username: {entry.username}</p>
                                      <p className="text-sm text-muted-foreground">User ID: {entry.userId}</p>
                                      {entry.ipAddress && (
                                        <p className="text-sm text-muted-foreground">IP: {entry.ipAddress}</p>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Action Details</h4>
                                      <p className="text-sm text-muted-foreground">Type: {entry.actionType}</p>
                                      <p className="text-sm text-muted-foreground">Entity: {entry.entityType}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Timestamp: {new Date(entry.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Description</h4>
                                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                                  </div>
                                  {entry.details && (
                                    <div>
                                      <h4 className="font-medium">Additional Details</h4>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {JSON.stringify(entry.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {entry.errorMessage && (
                                    <div>
                                      <h4 className="font-medium text-red-600">Error Message</h4>
                                      <p className="text-sm text-red-600">{entry.errorMessage}</p>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
              <p className="mt-2 text-muted-foreground">
                {hasActiveFilters()
                  ? "Try adjusting your filters or search criteria."
                  : "No audit logs have been recorded yet."}
              </p>
              {!hasActiveFilters() && (
                <div className="mt-4 space-x-2">
                  <Button onClick={seedSampleData} variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Add Sample Data
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of{" "}
                {totalItems} entries
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
