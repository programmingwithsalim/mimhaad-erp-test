"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, AlertTriangle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AuditLogEntry } from "@/lib/audit-logger"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AuditTrailTableProps {
  data: AuditLogEntry[]
  isLoading: boolean
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (pageSize: number) => void
  totalItems: number
}

export function AuditTrailTable({
  data,
  isLoading,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems,
}: AuditTrailTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  // Calculate pagination
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  // Get action type badge color
  const getActionTypeBadge = (actionType: string) => {
    // Authentication actions
    if (actionType.includes("login") || actionType.includes("logout") || actionType.includes("password_reset")) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
          Auth
        </Badge>
      )
    }

    // Transaction actions
    if (actionType.includes("transaction")) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
          Transaction
        </Badge>
      )
    }

    // Float actions
    if (actionType.includes("float")) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
          Float
        </Badge>
      )
    }

    // Export actions
    if (actionType.includes("export")) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
          Export
        </Badge>
      )
    }

    // CRUD actions
    if (["create", "update", "delete", "view"].includes(actionType)) {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
          {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
        </Badge>
      )
    }

    // System actions
    if (actionType.includes("system")) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
          System
        </Badge>
      )
    }

    // Default
    return <Badge variant="outline">{actionType}</Badge>
  }

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 hover:bg-orange-50 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
            Medium
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Low
          </Badge>
        )
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Success
          </Badge>
        )
      case "failure":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date)
  }

  // View log details - Fix the dialog opening
  const viewLogDetails = (log: AuditLogEntry) => {
    console.log("Viewing log details for:", log.id)
    setSelectedLog(log)
  }

  // Render loading skeleton
  if (isLoading && data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // If we have no data and we're not loading, show a friendly message
  if (!isLoading && data.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <p className="text-muted-foreground">No audit logs found matching your criteria.</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((entry) => (
                <TableRow key={entry.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{entry.username}</span>
                      <span className="text-xs text-muted-foreground">{entry.userId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getActionTypeBadge(entry.actionType)}
                      <span className="text-xs">{entry.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="capitalize">{entry.entityType.replace("_", " ")}</span>
                      {entry.entityId && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.entityId}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(entry.timestamp)}</span>
                      {entry.ipAddress && <span className="text-xs text-muted-foreground">{entry.ipAddress}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        viewLogDetails(entry)
                      }}
                      title="View Details"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {isLoading ? (
                    <div className="flex justify-center">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    "No audit logs found."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number.parseInt(value))
                setPage(1) // Reset to first page when changing page size
              }}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {totalItems} entries
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setPage(1)} disabled={page === 1 || isLoading}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(page - 1)} disabled={page === 1 || isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || totalPages === 0 || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0 || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Separate Dialog for Log Details */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogDescription>Detailed information about this audit log entry</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] rounded-md border p-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">User Information</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">User ID:</span>
                        <span className="text-sm">{selectedLog.userId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Username:</span>
                        <span className="text-sm">{selectedLog.username}</span>
                      </div>
                      {selectedLog.branchName && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Branch:</span>
                          <span className="text-sm">{selectedLog.branchName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Action Information</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Action Type:</span>
                        <span className="text-sm">{selectedLog.actionType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Entity Type:</span>
                        <span className="text-sm capitalize">{selectedLog.entityType.replace("_", " ")}</span>
                      </div>
                      {selectedLog.entityId && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Entity ID:</span>
                          <span className="text-sm">{selectedLog.entityId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Timestamp & Location</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Timestamp:</span>
                      <span className="text-sm">{formatDate(selectedLog.timestamp)}</span>
                    </div>
                    {selectedLog.ipAddress && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">IP Address:</span>
                        <span className="text-sm">{selectedLog.ipAddress}</span>
                      </div>
                    )}
                    {selectedLog.userAgent && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">User Agent:</span>
                        <span className="text-sm truncate max-w-[300px]">{selectedLog.userAgent}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status & Severity</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <span className="text-sm">{selectedLog.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Severity:</span>
                      <span className="text-sm">{selectedLog.severity}</span>
                    </div>
                    {selectedLog.errorMessage && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Error Message:</span>
                        <span className="text-sm text-red-500">{selectedLog.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="text-sm">{selectedLog.description}</p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <pre className="text-xs overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedLog.relatedEntities && selectedLog.relatedEntities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Related Entities</h3>
                    <div className="mt-2 space-y-2">
                      {selectedLog.relatedEntities.map((related, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm font-medium capitalize">
                            {related.entityType.replace("_", " ")}:
                          </span>
                          <span className="text-sm">{related.entityId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Metadata</h3>
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <pre className="text-xs overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
