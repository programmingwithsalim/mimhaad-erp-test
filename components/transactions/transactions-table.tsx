"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginationInfo } from "@/hooks/use-all-transactions";

interface Transaction {
  id: string;
  customer_name: string;
  phone_number: string;
  amount: number;
  fee: number;
  type: string;
  status: string;
  reference: string;
  provider: string;
  created_at: string;
  branch_id: string;
  branch_name?: string;
  processed_by: string;
  service_type: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onViewTransaction: (transaction: Transaction) => void;
}

export function TransactionsTable({
  transactions,
  loading,
  pagination,
  onPageChange,
  onNextPage,
  onPrevPage,
  onViewTransaction,
}: TransactionsTableProps) {
  const [pageSize, setPageSize] = useState(pagination.limit);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
      case "error":
        return "bg-red-100 text-red-800";
      case "reversed":
        return "bg-red-100 text-red-800";
      case "deleted":
        return "bg-gray-200 text-gray-700 line-through";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getServiceColor = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return "bg-blue-100 text-blue-800";
      case "agency_banking":
        return "bg-purple-100 text-purple-800";
      case "ezwich":
        return "bg-green-100 text-green-800";
      case "power":
        return "bg-yellow-100 text-yellow-800";
      case "jumia":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "momo":
        return (
          <AvatarFallback className="bg-blue-100 text-blue-600">
            M
          </AvatarFallback>
        );
      case "agency_banking":
        return (
          <AvatarFallback className="bg-purple-100 text-purple-600">
            A
          </AvatarFallback>
        );
      case "ezwich":
        return (
          <AvatarFallback className="bg-green-100 text-green-600">
            E
          </AvatarFallback>
        );
      case "power":
        return (
          <AvatarFallback className="bg-yellow-100 text-yellow-600">
            P
          </AvatarFallback>
        );
      case "jumia":
        return (
          <AvatarFallback className="bg-orange-100 text-orange-600">
            J
          </AvatarFallback>
        );
      default:
        return (
          <AvatarFallback className="bg-gray-100 text-gray-600">
            T
          </AvatarFallback>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No transactions found</h3>
        <p className="mt-2 text-muted-foreground">
          No transactions match your current filters or have been recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="hover:bg-muted/50 group"
              >
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      {getServiceIcon(transaction.service_type)}
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm capitalize">
                        {transaction.service_type.replace("_", " ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(
                          new Date(transaction.created_at),
                          "MMM dd, yyyy"
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), "HH:mm:ss")}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-sm">
                      {transaction.customer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.phone_number}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {transaction.type.replace("-", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      ₵{transaction.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fee: ₵{transaction.fee.toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {transaction.branch_name || "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => onViewTransaction(transaction)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.limit,
              pagination.totalCount
            )}{" "}
            of {pagination.totalCount} entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!pagination.hasPrevPage}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!pagination.hasNextPage}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
