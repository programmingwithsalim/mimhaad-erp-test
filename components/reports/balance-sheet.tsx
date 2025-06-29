"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { InfoIcon, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BalanceSheetProps {
  date: Date
  branch: string
}

interface BalanceSheetData {
  assets: {
    current: {
      cashAndCashEquivalents: number
      accountsReceivable: number
      inventory: number
      prepaidExpenses: number
      shortTermInvestments: number
      totalCurrent: number
    }
    nonCurrent: {
      propertyPlantEquipment: number
      accumulatedDepreciation: number
      netPropertyPlantEquipment: number
      intangibleAssets: number
      longTermInvestments: number
      goodwill: number
      totalNonCurrent: number
    }
    totalAssets: number
  }
  liabilities: {
    current: {
      accountsPayable: number
      shortTermDebt: number
      accruedLiabilities: number
      currentPortionLongTermDebt: number
      taxesPayable: number
      totalCurrent: number
    }
    nonCurrent: {
      longTermDebt: number
      deferredTaxLiabilities: number
      pensionObligations: number
      totalNonCurrent: number
    }
    totalLiabilities: number
  }
  equity: {
    capitalStock: number
    retainedEarnings: number
    accumulatedOtherComprehensiveIncome: number
    totalEquity: number
  }
}

export function BalanceSheet({ date, branch }: BalanceSheetProps) {
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBalanceSheetData()
  }, [date, branch])

  const fetchBalanceSheetData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        date: format(date, "yyyy-MM-dd"),
        branch: branch,
      })

      const response = await fetch(`/api/reports/balance-sheet?${params}`)
      const result = await response.json()

      if (result.success) {
        setBalanceSheetData(result.data)
      } else {
        setError(result.error || "Failed to fetch balance sheet data")
      }
    } catch (error) {
      console.error("Error fetching balance sheet:", error)
      setError("Failed to fetch balance sheet data")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading balance sheet...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error loading balance sheet</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!balanceSheetData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No balance sheet data available</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalLiabilitiesAndEquity = balanceSheetData.liabilities.totalLiabilities + balanceSheetData.equity.totalEquity

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                As of {format(date, "MMMM d, yyyy")}
                {branch !== "all" && ` • ${branch.charAt(0).toUpperCase() + branch.slice(1)} Branch`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="h-6">
              {balanceSheetData.assets.totalAssets === totalLiabilitiesAndEquity ? "Balanced" : "Unbalanced"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₵{(balanceSheetData.assets.totalAssets / 1000000).toFixed(2)}M</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₵{(balanceSheetData.liabilities.totalLiabilities / 1000000).toFixed(2)}M
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₵{(balanceSheetData.equity.totalEquity / 1000000).toFixed(2)}M</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Assets</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70%]">Description</TableHead>
                    <TableHead className="text-right">Amount (₵)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-medium">
                    <TableCell colSpan={2}>Current Assets</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Cash and Cash Equivalents</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.cashAndCashEquivalents.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Accounts Receivable</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.accountsReceivable.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Inventory</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.inventory.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Prepaid Expenses</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.prepaidExpenses.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Short-term Investments</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.shortTermInvestments.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total Current Assets</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.current.totalCurrent.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-medium">
                    <TableCell colSpan={2} className="pt-4">
                      Non-Current Assets
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Property, Plant & Equipment</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.propertyPlantEquipment.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Less: Accumulated Depreciation</TableCell>
                    <TableCell className="text-right">
                      ({Math.abs(balanceSheetData.assets.nonCurrent.accumulatedDepreciation).toLocaleString()})
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Net Property, Plant & Equipment</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.netPropertyPlantEquipment.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Intangible Assets</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.intangibleAssets.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Long-term Investments</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.longTermInvestments.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Goodwill</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.goodwill.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total Non-Current Assets</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.assets.nonCurrent.totalNonCurrent.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-bold text-lg">
                    <TableCell className="pt-4">Total Assets</TableCell>
                    <TableCell className="pt-4 text-right">
                      {balanceSheetData.assets.totalAssets.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold">Liabilities and Equity</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70%]">Description</TableHead>
                    <TableHead className="text-right">Amount (₵)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-medium">
                    <TableCell colSpan={2}>Current Liabilities</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Accounts Payable</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.accountsPayable.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Short-term Debt</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.shortTermDebt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Accrued Liabilities</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.accruedLiabilities.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Current Portion of Long-Term Debt</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.currentPortionLongTermDebt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Taxes Payable</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.taxesPayable.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total Current Liabilities</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.current.totalCurrent.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-medium">
                    <TableCell colSpan={2} className="pt-4">
                      Non-Current Liabilities
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Long-Term Debt</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.nonCurrent.longTermDebt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Deferred Tax Liabilities</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.nonCurrent.deferredTaxLiabilities.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Pension Obligations</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.nonCurrent.pensionObligations.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total Non-Current Liabilities</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.liabilities.nonCurrent.totalNonCurrent.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-bold">
                    <TableCell className="pt-4">Total Liabilities</TableCell>
                    <TableCell className="pt-4 text-right">
                      {balanceSheetData.liabilities.totalLiabilities.toLocaleString()}
                    </TableCell>
                  </TableRow>

                  <TableRow className="font-medium">
                    <TableCell colSpan={2} className="pt-4">
                      Shareholders' Equity
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Capital Stock</TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.equity.capitalStock.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8 flex items-center">
                      Retained Earnings
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="ml-1 h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[200px] text-xs">
                            Accumulated earnings minus dividends distributed to shareholders
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      {balanceSheetData.equity.retainedEarnings.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  {balanceSheetData.equity.accumulatedOtherComprehensiveIncome !== 0 && (
                    <TableRow>
                      <TableCell className="pl-8">Accumulated Other Comprehensive Income</TableCell>
                      <TableCell className="text-right">
                        {balanceSheetData.equity.accumulatedOtherComprehensiveIncome.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold">
                    <TableCell>Total Shareholders' Equity</TableCell>
                    <TableCell className="text-right">{balanceSheetData.equity.totalEquity.toLocaleString()}</TableCell>
                  </TableRow>

                  <TableRow className="font-bold text-lg">
                    <TableCell className="pt-4">Total Liabilities and Equity</TableCell>
                    <TableCell className="pt-4 text-right">{totalLiabilitiesAndEquity.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
