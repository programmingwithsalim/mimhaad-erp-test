"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, isValid } from "date-fns"
import { AlertCircle, CheckCircle2, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface ReconciliationReportProps {
  date: Date
  branch: string
}

export function ReconciliationReport({ date, branch }: ReconciliationReportProps) {
  // Mock data - in a real app, this would come from an API
  const reconciliationData = {
    services: [
      {
        name: "MoMo",
        systemBalance: 1250000,
        floatBalance: 1248500,
        difference: 1500,
        status: "unreconciled",
      },
      {
        name: "Agency Banking",
        systemBalance: 850000,
        floatBalance: 850000,
        difference: 0,
        status: "reconciled",
      },
      {
        name: "E-Zwich",
        systemBalance: 450000,
        floatBalance: 450000,
        difference: 0,
        status: "reconciled",
      },
      {
        name: "Power",
        systemBalance: 350000,
        floatBalance: 349800,
        difference: 200,
        status: "unreconciled",
      },
      {
        name: "Jumia",
        systemBalance: 250000,
        floatBalance: 250000,
        difference: 0,
        status: "reconciled",
      },
    ],
    summary: {
      totalSystemBalance: 3150000,
      totalFloatBalance: 3148300,
      totalDifference: 1700,
      reconciledCount: 3,
      unreconciledCount: 2,
    },
    lastReconciled: new Date(2025, 4, 15, 18, 30),
  }

  const [showDetails, setShowDetails] = useState(false)

  // Safe date formatting with validation
  const formatDate = (dateValue: Date | string | null | undefined) => {
    if (!dateValue) return "N/A"

    const dateObj = typeof dateValue === "string" ? new Date(dateValue) : dateValue

    if (!isValid(dateObj)) {
      return "Invalid Date"
    }

    try {
      return format(dateObj, "MMMM d, yyyy")
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Invalid Date"
    }
  }

  const formatDateTime = (dateValue: Date | string | null | undefined) => {
    if (!dateValue) return "N/A"

    const dateObj = typeof dateValue === "string" ? new Date(dateValue) : dateValue

    if (!isValid(dateObj)) {
      return "Invalid Date"
    }

    try {
      return format(dateObj, "PPp")
    } catch (error) {
      console.error("DateTime formatting error:", error)
      return "Invalid Date"
    }
  }

  const formatTime = (dateValue: Date | string | null | undefined) => {
    if (!dateValue) return "N/A"

    const dateObj = typeof dateValue === "string" ? new Date(dateValue) : dateValue

    if (!isValid(dateObj)) {
      return "Invalid Time"
    }

    try {
      return format(dateObj, "h:mm a")
    } catch (error) {
      console.error("Time formatting error:", error)
      return "Invalid Time"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Daily Reconciliation Report</CardTitle>
            <CardDescription>
              Cash vs Float Reconciliation for {formatDate(date)}
              {branch !== "all" && ` • ${branch.charAt(0).toUpperCase() + branch.slice(1)} Branch`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={reconciliationData.summary.totalDifference === 0 ? "outline" : "destructive"}
              className="h-6"
            >
              {reconciliationData.summary.totalDifference === 0 ? "Fully Reconciled" : "Unreconciled Items"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₵{reconciliationData.summary.totalSystemBalance.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Float Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₵{reconciliationData.summary.totalFloatBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Difference</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${reconciliationData.summary.totalDifference > 0 ? "text-destructive" : ""}`}
              >
                ₵{reconciliationData.summary.totalDifference.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {reconciliationData.summary.totalDifference > 0 && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Reconciliation Required</AlertTitle>
            <AlertDescription>
              There are {reconciliationData.summary.unreconciledCount} services with unreconciled balances. Please
              review and resolve the differences.
            </AlertDescription>
          </Alert>
        )}

        {reconciliationData.summary.totalDifference === 0 && (
          <Alert className="mt-6 border-green-500 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Fully Reconciled</AlertTitle>
            <AlertDescription>
              All services are fully reconciled for {formatDate(date)}. Last reconciliation was completed at{" "}
              {formatTime(reconciliationData.lastReconciled)}.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Service Reconciliation</h3>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
          </div>

          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">System Balance</TableHead>
                <TableHead className="text-right">Float Balance</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliationData.services.map((service) => (
                <TableRow key={service.name}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-right">₵{service.systemBalance.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₵{service.floatBalance.toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${service.difference > 0 ? "text-destructive font-medium" : ""}`}>
                    {service.difference > 0 ? `₵${service.difference.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={service.status === "reconciled" ? "outline" : "destructive"}>
                      {service.status === "reconciled" ? "Reconciled" : "Unreconciled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  ₵{reconciliationData.summary.totalSystemBalance.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ₵{reconciliationData.summary.totalFloatBalance.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right ${reconciliationData.summary.totalDifference > 0 ? "text-destructive" : ""}`}
                >
                  {reconciliationData.summary.totalDifference > 0
                    ? `₵${reconciliationData.summary.totalDifference.toLocaleString()}`
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={reconciliationData.summary.totalDifference === 0 ? "outline" : "destructive"}>
                    {reconciliationData.summary.totalDifference === 0 ? "Reconciled" : "Unreconciled"}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {showDetails && (
          <div className="mt-6 space-y-6">
            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-semibold">Reconciliation Details</h3>

              {reconciliationData.services
                .filter((service) => service.difference > 0)
                .map((service) => (
                  <Card key={service.name} className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-base">{service.name} Reconciliation</CardTitle>
                      <CardDescription>Difference: ₵{service.difference.toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Potential Causes:</h4>
                          <ul className="ml-6 mt-2 list-disc text-sm">
                            <li>Timing differences between system and provider</li>
                            <li>Failed transactions not properly reversed</li>
                            <li>Manual adjustments not recorded</li>
                            <li>System calculation errors</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium">Recommended Actions:</h4>
                          <ul className="ml-6 mt-2 list-disc text-sm">
                            <li>Review transaction logs for the past 24 hours</li>
                            <li>Check for pending transactions in provider portal</li>
                            <li>Verify all manual adjustments were properly recorded</li>
                            <li>Contact provider support if discrepancy persists</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        View Transactions
                      </Button>
                      <Button size="sm">Reconcile Manually</Button>
                    </CardFooter>
                  </Card>
                ))}

              {reconciliationData.services.filter((service) => service.difference > 0).length === 0 && (
                <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <h3 className="font-medium">All Services Reconciled</h3>
                    <p className="text-sm text-muted-foreground">There are no reconciliation issues to display</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
