"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"

export type FloatAccount = {
  id: string
  provider: string
  account_type: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  branch_id: string
  branch_name: string
  status: string
  created_at: string
  updated_at: string
}

export const columns: ColumnDef<FloatAccount>[] = [
  {
    accessorKey: "provider",
    header: "Provider",
    cell: ({ row }) => {
      const provider = row.getValue("provider") as string
      return <div className="font-medium">{provider}</div>
    },
  },
  {
    accessorKey: "account_type",
    header: "Account Type",
    cell: ({ row }) => {
      const type = row.getValue("account_type") as string
      return (
        <Badge variant="outline" className="capitalize">
          {type.replace(/-/g, " ")}
        </Badge>
      )
    },
  },
  {
    accessorKey: "current_balance",
    header: "Current Balance",
    cell: ({ row }) => {
      const balance = row.getValue("current_balance") as number
      return <div className="text-right font-medium">{formatCurrency(balance)}</div>
    },
  },
  {
    accessorKey: "min_threshold",
    header: "Min Threshold",
    cell: ({ row }) => {
      const threshold = row.getValue("min_threshold") as number
      return <div className="text-right text-muted-foreground">{formatCurrency(threshold)}</div>
    },
  },
  {
    accessorKey: "max_threshold",
    header: "Max Threshold",
    cell: ({ row }) => {
      const threshold = row.getValue("max_threshold") as number
      return <div className="text-right text-muted-foreground">{formatCurrency(threshold)}</div>
    },
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => {
      const branchName = row.getValue("branch_name") as string
      return <div className="text-sm">{branchName}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={status === "active" ? "default" : "secondary"} className="capitalize">
          {status}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const account = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(account.id)}>
              Copy account ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit account
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
