"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js"
import { Bar, Pie } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

interface RevenueBreakdownProps {
  dateRange: { from: Date; to: Date }
  branch: string
}

export function RevenueBreakdown({ dateRange, branch }: RevenueBreakdownProps) {
  const { theme } = useTheme()
  const [chartView, setChartView] = useState<string>("service")
  const [barChartData, setBarChartData] = useState<any>(null)
  const [pieChartData, setPieChartData] = useState<any>(null)

  // Mock data - in a real app, this would come from an API
  const revenueData = {
    byService: [
      { service: "MoMo", revenue: 1250000 },
      { service: "Agency Banking", revenue: 850000 },
      { service: "E-Zwich", revenue: 450000 },
      { service: "Power", revenue: 350000 },
      { service: "Jumia", revenue: 250000 },
    ],
    byBranch: [
      { branch: "Accra HQ", revenue: 1500000 },
      { branch: "Kumasi", revenue: 850000 },
      { branch: "Takoradi", revenue: 450000 },
      { branch: "Tamale", revenue: 350000 },
    ],
    byDate: [
      { date: new Date(2025, 4, 1), revenue: 120000 },
      { date: new Date(2025, 4, 2), revenue: 135000 },
      { date: new Date(2025, 4, 3), revenue: 110000 },
      { date: new Date(2025, 4, 4), revenue: 145000 },
      { date: new Date(2025, 4, 5), revenue: 160000 },
      { date: new Date(2025, 4, 6), revenue: 130000 },
      { date: new Date(2025, 4, 7), revenue: 125000 },
      { date: new Date(2025, 4, 8), revenue: 140000 },
      { date: new Date(2025, 4, 9), revenue: 150000 },
      { date: new Date(2025, 4, 10), revenue: 155000 },
      { date: new Date(2025, 4, 11), revenue: 165000 },
      { date: new Date(2025, 4, 12), revenue: 170000 },
      { date: new Date(2025, 4, 13), revenue: 145000 },
      { date: new Date(2025, 4, 14), revenue: 135000 },
      { date: new Date(2025, 4, 15), revenue: 165000 },
    ],
    totalRevenue: 3150000,
  }

  useEffect(() => {
    // Set colors based on the current theme
    const isDark = theme === "dark"
    const barColors = [
      "rgba(56, 189, 248, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(34, 211, 238, 0.8)",
      "rgba(132, 204, 22, 0.8)",
    ]

    // Prepare bar chart data
    if (chartView === "service") {
      setBarChartData({
        labels: revenueData.byService.map((item) => item.service),
        datasets: [
          {
            label: "Revenue",
            data: revenueData.byService.map((item) => item.revenue),
            backgroundColor: barColors,
            borderRadius: 6,
            borderWidth: 0,
            barThickness: 24,
            maxBarThickness: 40,
          },
        ],
      })

      setPieChartData({
        labels: revenueData.byService.map((item) => item.service),
        datasets: [
          {
            data: revenueData.byService.map((item) => item.revenue),
            backgroundColor: barColors,
            borderWidth: 1,
            borderColor: isDark ? "#1f2937" : "#ffffff",
          },
        ],
      })
    } else if (chartView === "branch") {
      setBarChartData({
        labels: revenueData.byBranch.map((item) => item.branch),
        datasets: [
          {
            label: "Revenue",
            data: revenueData.byBranch.map((item) => item.revenue),
            backgroundColor: barColors,
            borderRadius: 6,
            borderWidth: 0,
            barThickness: 24,
            maxBarThickness: 40,
          },
        ],
      })

      setPieChartData({
        labels: revenueData.byBranch.map((item) => item.branch),
        datasets: [
          {
            data: revenueData.byBranch.map((item) => item.revenue),
            backgroundColor: barColors,
            borderWidth: 1,
            borderColor: isDark ? "#1f2937" : "#ffffff",
          },
        ],
      })
    } else if (chartView === "date") {
      setBarChartData({
        labels: revenueData.byDate.map((item) => format(item.date, "MMM d")),
        datasets: [
          {
            label: "Revenue",
            data: revenueData.byDate.map((item) => item.revenue),
            backgroundColor: "rgba(56, 189, 248, 0.8)",
            borderRadius: 6,
            borderWidth: 0,
            barThickness: 16,
            maxBarThickness: 24,
          },
        ],
      })

      // No pie chart for date view
      setPieChartData(null)
    }
  }, [chartView, theme])

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
        titleColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        bodyColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => `Revenue: ₵${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          callback: (value: number) => `₵${value.toLocaleString()}`,
        },
      },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
        titleColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        bodyColor: theme === "dark" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
        borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const label = context.label || ""
            const value = context.raw.toLocaleString()
            const percentage = ((context.raw / revenueData.totalRevenue) * 100).toFixed(1)
            return `${label}: ₵${value} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>
              {format(dateRange.from, "MMMM d, yyyy")} - {format(dateRange.to, "MMMM d, yyyy")}
              {branch !== "all" && ` • ${branch.charAt(0).toUpperCase() + branch.slice(1)} Branch`}
            </CardDescription>
          </div>
          <Select value={chartView} onValueChange={setChartView}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">By Service</SelectItem>
              <SelectItem value="branch">By Branch</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <div className="h-[400px]">{barChartData && <Bar data={barChartData} options={barOptions} />}</div>
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            {pieChartData ? (
              <div className="h-[400px]">
                <Pie data={pieChartData} options={pieOptions} />
              </div>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <p className="text-muted-foreground">Distribution view not available for date breakdown</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {chartView === "service" ? "Service" : chartView === "branch" ? "Branch" : "Date"}
                  </TableHead>
                  <TableHead className="text-right">Revenue (₵)</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartView === "service" &&
                  revenueData.byService.map((item) => (
                    <TableRow key={item.service}>
                      <TableCell className="font-medium">{item.service}</TableCell>
                      <TableCell className="text-right">{item.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((item.revenue / revenueData.totalRevenue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}

                {chartView === "branch" &&
                  revenueData.byBranch.map((item) => (
                    <TableRow key={item.branch}>
                      <TableCell className="font-medium">{item.branch}</TableCell>
                      <TableCell className="text-right">{item.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((item.revenue / revenueData.totalRevenue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}

                {chartView === "date" &&
                  revenueData.byDate.map((item) => (
                    <TableRow key={format(item.date, "yyyy-MM-dd")}>
                      <TableCell className="font-medium">{format(item.date, "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">{item.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((item.revenue / revenueData.totalRevenue) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}

                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{revenueData.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
