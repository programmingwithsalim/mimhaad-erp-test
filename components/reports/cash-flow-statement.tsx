"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface CashFlowStatementProps {
  dateRange: { from: Date; to: Date }
  branch: string
}

export function CashFlowStatement({ dateRange, branch }: CashFlowStatementProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCashFlowData()
  }, [dateRange, branch])

  const fetchCashFlowData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        from: format(dateRange.from, "yyyy-MM-dd"),
        to: format(dateRange.to, "yyyy-MM-dd"),
        branch: branch,
      })

      const response = await fetch(`/api/reports/cash-flow?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || "Failed to fetch cash flow data")
      }
    } catch (error) {
      console.error("Error fetching cash flow:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading cash flow statement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Cash Flow Statement</CardTitle>
            <p className="text-sm text-muted-foreground">
              For the period {format(dateRange.from, "MMM d, yyyy")} to {format(dateRange.to, "MMM d, yyyy")}
              {branch !== "all" && ` • ${branch} Branch`}
            </p>
          </div>
          <Badge variant="outline">{data?.status === "complete" ? "Complete" : "Preliminary"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70%]">Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Operating Activities */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={2}>CASH FLOWS FROM OPERATING ACTIVITIES</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Net Income</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.operating?.net_income || 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Transaction Fee Collections</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.operating?.fee_collections || 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Commission Payments</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.operating?.commission_payments || 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Operating Expense Payments</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.operating?.expense_payments || 0)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold border-t">
              <TableCell>Net Cash from Operating Activities</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.operating?.total || 0)}</TableCell>
            </TableRow>

            {/* Investing Activities */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={2} className="pt-6">
                CASH FLOWS FROM INVESTING ACTIVITIES
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Float Account Investments</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.investing?.float_investments || 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Equipment Purchases</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.investing?.equipment_purchases || 0)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold border-t">
              <TableCell>Net Cash from Investing Activities</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.investing?.total || 0)}</TableCell>
            </TableRow>

            {/* Financing Activities */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={2} className="pt-6">
                CASH FLOWS FROM FINANCING ACTIVITIES
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Capital Contributions</TableCell>
              <TableCell className="text-right">
                {formatCurrency(data?.financing?.capital_contributions || 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Loan Proceeds</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.financing?.loan_proceeds || 0)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-8">Loan Repayments</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.financing?.loan_repayments || 0)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold border-t">
              <TableCell>Net Cash from Financing Activities</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.financing?.total || 0)}</TableCell>
            </TableRow>

            {/* Net Change in Cash */}
            <TableRow className="font-bold text-lg border-t-2">
              <TableCell className="pt-4">Net Change in Cash</TableCell>
              <TableCell
                className={`pt-4 text-right ${(data?.net_change || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(data?.net_change || 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Cash at Beginning of Period</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.beginning_cash || 0)}</TableCell>
            </TableRow>
            <TableRow className="font-bold border-t">
              <TableCell>Cash at End of Period</TableCell>
              <TableCell className="text-right">{formatCurrency(data?.ending_cash || 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
