"use client"

import { useState } from "react"
import { useFloatAccounts } from "@/hooks/use-float-accounts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, ArrowUpDown, Download, Search, RefreshCw, Plus } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function FloatAccountList() {
  const { accounts, loading, error, refetch } = useFloatAccounts()
  const [searchQuery, setSearchQuery] = useState("")

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      account.branch_name.toLowerCase().includes(query) ||
      account.account_type.toLowerCase().includes(query) ||
      (account.provider && account.provider.toLowerCase().includes(query))
    )
  })

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

  // Get float status
  const getFloatStatus = (account: any) => {
    if (account.current_balance < account.min_threshold) {
      return <Badge variant="destructive">Low</Badge>
    } else if (account.current_balance > account.max_threshold) {
      return <Badge variant="secondary">Excess</Badge>
    } else {
      return (
        <Badge variant="default" className="bg-green-500">
          Healthy
        </Badge>
      )
    }
  }

  // Get service label
  const getServiceLabel = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case "momo":
        return "Mobile Money"
      case "agency-banking":
        return "Agency Banking"
      case "e-zwich":
        return "E-Zwich"
      case "cash-in-till":
        return "Cash in Till"
      case "power":
        return "Power"
      default:
        return serviceType
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Error Loading Float Accounts</p>
              <p className="text-sm">{error.message}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={refetch}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/dashboard/float-management/accounts/create">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 md:w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/dashboard/float-management/accounts/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Account
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Float Accounts</CardTitle>
          <CardDescription>
            Manage float accounts across branches and services
            {!loading && (
              <span className="ml-2 text-sm">
                ({filteredAccounts.length} of {accounts.length} accounts)
              </span>
            )}
          </CardDescription>
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
                  <TableHead>Service</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {searchQuery ? (
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                          <p>No float accounts found matching "{searchQuery}"</p>
                          <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                            Clear search
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                          <p>No float accounts found</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create your first float account to get started
                          </p>
                          <Link href="/dashboard/float-management/accounts/create">
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Float Account
                            </Button>
                          </Link>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.branch_name}</TableCell>
                      <TableCell>{getServiceLabel(account.account_type)}</TableCell>
                      <TableCell>{account.provider || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.current_balance)}</TableCell>
                      <TableCell>{getFloatStatus(account)}</TableCell>
                      <TableCell>{formatDate(account.last_updated)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/float-management/accounts/edit/${account.id}`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
