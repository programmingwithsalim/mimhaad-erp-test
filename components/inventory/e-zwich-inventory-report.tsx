"use client"

import { useState } from "react"
import { CalendarIcon, Download, FileText, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function EZwichInventoryReport() {
  const { toast } = useToast()
  const [reportType, setReportType] = useState<string>("inventory-summary")
  const [dateRange, setDateRange] = useState<"last-7-days" | "last-30-days" | "last-90-days" | "custom">("last-30-days")
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [fileFormat, setFileFormat] = useState<string>("pdf")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const handleGenerateReport = async () => {
    setIsGenerating(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Report generated",
      description: `Your ${getReportName(reportType)} has been generated successfully.`,
    })

    setIsGenerating(false)
  }

  const getReportName = (type: string) => {
    switch (type) {
      case "inventory-summary":
        return "Inventory Summary Report"
      case "stock-movement":
        return "Stock Movement Report"
      case "card-issuance":
        return "Card Issuance Report"
      case "low-stock":
        return "Low Stock Report"
      case "valuation":
        return "Inventory Valuation Report"
      default:
        return "Report"
    }
  }

  const handleDateRangeChange = (value: string) => {
    const today = new Date()

    switch (value) {
      case "last-7-days":
        setStartDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
        setEndDate(today)
        break
      case "last-30-days":
        setStartDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))
        setEndDate(today)
        break
      case "last-90-days":
        setStartDate(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000))
        setEndDate(today)
        break
    }

    setDateRange(value as any)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory-summary">Inventory Summary</SelectItem>
                <SelectItem value="stock-movement">Stock Movement</SelectItem>
                <SelectItem value="card-issuance">Card Issuance</SelectItem>
                <SelectItem value="low-stock">Low Stock Alert</SelectItem>
                <SelectItem value="valuation">Inventory Valuation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fileFormat">File Format</Label>
            <Select value={fileFormat} onValueChange={setFileFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select file format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full mt-4" onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </div>

        <div>
          <Label>Report Preview</Label>
          <Card className="mt-2 h-[300px] flex items-center justify-center">
            <CardContent className="text-center p-6">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="mt-4 font-medium">{getReportName(reportType)}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-4">Generate the report to view and download</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Recent Reports</h3>

        <div className="space-y-2">
          <div className="rounded-md border">
            <div className="grid grid-cols-4 p-4 text-sm font-medium">
              <div>Report Name</div>
              <div>Generated On</div>
              <div>Format</div>
              <div className="text-right">Actions</div>
            </div>
            <Separator />
            <div className="divide-y">
              <div className="grid grid-cols-4 p-4 text-sm">
                <div>Inventory Summary Report</div>
                <div>{format(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}</div>
                <div>PDF</div>
                <div className="text-right">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 p-4 text-sm">
                <div>Card Issuance Report</div>
                <div>{format(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}</div>
                <div>Excel</div>
                <div className="text-right">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 p-4 text-sm">
                <div>Stock Movement Report</div>
                <div>{format(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), "MMM d, yyyy")}</div>
                <div>PDF</div>
                <div className="text-right">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
