"use client"

import { useState } from "react"
import { ArrowUpDown, MoreHorizontal, Eye, CheckCircle, XCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FloatRequest {
  id: string
  branchId: string
  branchName: string
  branchCode: string
  amount: number
  reason: string
  urgency: "low" | "medium" | "high"
  status: "pending" | "approved" | "rejected"
  requestDate: string
  approvedAmount?: number
  approvalDate?: string
  notes?: string
  rejectionReason?: string
}

interface FloatRequestTableProps {
  requests: FloatRequest[]
}

export function FloatRequestTable({ requests }: FloatRequestTableProps) {
  const [sortBy, setSortBy] = useState<string>("requestDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const sortedData = [...requests].sort((a, b) => {
    const aValue = a[sortBy as keyof FloatRequest]
    const bValue = b[sortBy as keyof FloatRequest]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-GH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "destructive"
      case "medium":
        return "warning"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "success"
      case "rejected":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">
              <Button
                variant="ghost"
                onClick={() => handleSort("branchName")}
                className="flex items-center gap-1 p-0 hover:bg-transparent"
              >
                Branch
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => handleSort("amount")}
                className="flex items-center gap-1 p-0 hover:bg-transparent"
              >
                Amount
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("urgency")}
                className="flex items-center gap-1 p-0 hover:bg-transparent"
              >
                Urgency
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("status")}
                className="flex items-center gap-1 p-0 hover:bg-transparent"
              >
                Status
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                onClick={() => handleSort("requestDate")}
                className="flex items-center gap-1 p-0 hover:bg-transparent"
              >
                Request Date
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                <div>
                  {request.branchName}
                  <div className="text-xs text-muted-foreground">{request.branchCode}</div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {request.amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
              </TableCell>
              <TableCell>
                <Badge variant={getUrgencyColor(request.urgency) as any}>
                  {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(request.status) as any}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatDate(request.requestDate)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </DropdownMenuItem>
                    {request.status === "pending" && (
                      <>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
