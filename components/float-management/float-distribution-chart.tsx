"use client"

import { useState, useEffect } from "react"
import { Pie, Doughnut, Bar, Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  type ChartData,
  type ChartOptions,
  Colors,
} from "chart.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, BarChart, LineChart, PieChart, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Colors,
)

export interface FloatAccount {
  id: string
  branch_id: string
  branch_name?: string
  account_type: string
  provider?: string
  current_balance: number
  min_threshold: number
  max_threshold: number
  is_active: boolean
  last_updated: string
}

interface FloatDistributionChartProps {
  className?: string
}

type GroupByOption = "account_type" | "branch_name" | "provider" | "status"
type ChartType = "pie" | "doughnut" | "bar" | "line"

export function FloatDistributionChart({ className }: FloatDistributionChartProps) {
  const [accounts, setAccounts] = useState<FloatAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>("doughnut")
  const [groupBy, setGroupBy] = useState<GroupByOption>("account_type")

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/float-accounts")
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`)
      }

      const data = await response.json()
      console.log("📊 [CHART] Float accounts API response:", data)

      // Handle different response formats
      let accountsData: FloatAccount[] = []

      if (Array.isArray(data)) {
        accountsData = data
      } else if (data.success && data.accounts && Array.isArray(data.accounts)) {
        // Handle the format: {"success":true,"accounts":[...]}
        accountsData = data.accounts
      } else if (data.data && Array.isArray(data.data)) {
        // Handle the format: {"success":true,"data":[...]}
        accountsData = data.data
      } else if (data.floatAccounts && Array.isArray(data.floatAccounts)) {
        accountsData = data.floatAccounts
      } else {
        console.error("📊 [CHART] Unexpected data format:", data)
        throw new Error("Invalid data format received")
      }

      // Validate and normalize account data
      const validAccounts = accountsData
        .filter(
          (account) => account && typeof account.current_balance !== "undefined" && account.current_balance !== null,
        )
        .map((account) => ({
          ...account,
          current_balance: Number(account.current_balance),
          min_threshold: Number(account.min_threshold || 0),
          max_threshold: Number(account.max_threshold || 0),
          branch_name: account.branch_name || "Unknown Branch",
        }))

      console.log("📊 [CHART] Processed accounts:", validAccounts.length)
      setAccounts(validAccounts)
    } catch (err) {
      console.error("❌ [CHART] Error fetching float accounts for chart:", err)
      setError(err instanceof Error ? err.message : "Failed to load accounts")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  // Group accounts based on selected grouping option
  const groupedData = accounts.reduce<Record<string, number>>((acc, account) => {
    let key: string

    switch (groupBy) {
      case "branch_name":
        key = account.branch_name || "Unknown Branch"
        break
      case "provider":
        key = account.provider || "No Provider"
        break
      case "status":
        if (account.current_balance < account.min_threshold) {
          key = "Low Balance"
        } else if (account.current_balance > account.max_threshold) {
          key = "Excess Balance"
        } else {
          key = "Healthy"
        }
        break
      case "account_type":
      default:
        key = getServiceLabel(account.account_type)
        break
    }

    if (!acc[key]) {
      acc[key] = 0
    }
    acc[key] += account.current_balance
    return acc
  }, {})

  // Sort data by value in descending order
  const sortedEntries = Object.entries(groupedData).sort((a, b) => b[1] - a[1])

  // Prepare chart data based on chart type
  const getPieChartData = (): ChartData<"pie" | "doughnut"> => {
    return {
      labels: sortedEntries.map(([label]) => label),
      datasets: [
        {
          data: sortedEntries.map(([_, value]) => value),
          backgroundColor: getChartColors(
            groupBy,
            sortedEntries.map(([label]) => label),
          ),
          borderColor: "white",
          borderWidth: 1,
        },
      ],
    }
  }

  const getBarLineChartData = (): ChartData<"bar" | "line"> => {
    return {
      labels: sortedEntries.map(([label]) => label),
      datasets: [
        {
          label: `Float Balance by ${getGroupByLabel(groupBy)}`,
          data: sortedEntries.map(([_, value]) => value),
          backgroundColor: getChartColors(
            groupBy,
            sortedEntries.map(([label]) => label),
          ),
          borderColor:
            chartType === "line"
              ? getChartColors(
                  groupBy,
                  sortedEntries.map(([label]) => label),
                )[0]
              : "white",
          borderWidth: chartType === "line" ? 2 : 1,
          tension: 0.1,
        },
      ],
    }
  }

  // Chart options based on chart type
  const getPieChartOptions = (): ChartOptions<"pie" | "doughnut"> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 15,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw as number
              const total = context.dataset.data.reduce((sum: number, val: any) => sum + val, 0) as number
              const percentage = ((value / total) * 100).toFixed(1)
              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
            },
          },
        },
      },
    }
  }

  const getBarLineChartOptions = (): ChartOptions<"bar" | "line"> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${formatCurrency(context.parsed.y)}`
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              return formatCurrency(value as number)
            },
          },
        },
      },
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Helper function to get service label
  function getServiceLabel(serviceType: string): string {
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

  // Helper function to get chart colors based on grouping
  function getChartColors(groupBy: GroupByOption, labels: string[]): string[] {
    if (groupBy === "status") {
      return labels.map((label) => {
        if (label === "Low Balance") return "rgba(239, 68, 68, 0.8)" // red
        if (label === "Excess Balance") return "rgba(59, 130, 246, 0.8)" // blue
        return "rgba(34, 197, 94, 0.8)" // green
      })
    }

    // Default color palette
    const colors = [
      "rgba(37, 99, 235, 0.8)", // blue-600
      "rgba(34, 197, 94, 0.8)", // green-500
      "rgba(249, 115, 22, 0.8)", // orange-500
      "rgba(236, 72, 153, 0.8)", // pink-500
      "rgba(139, 92, 246, 0.8)", // violet-500
      "rgba(234, 179, 8, 0.8)", // yellow-500
      "rgba(14, 165, 233, 0.8)", // sky-500
      "rgba(168, 85, 247, 0.8)", // purple-500
      "rgba(239, 68, 68, 0.8)", // red-500
      "rgba(20, 184, 166, 0.8)", // teal-500
    ]

    // If we have more labels than colors, repeat the colors
    return labels.map((_, index) => colors[index % colors.length])
  }

  // Calculate total balance
  const totalBalance = sortedEntries.reduce((sum, [_, value]) => sum + value, 0)

  // Get chart icon based on type
  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case "pie":
      case "doughnut":
        return <PieChart className="h-3.5 w-3.5 mr-1" />
      case "bar":
        return <BarChart className="h-3.5 w-3.5 mr-1" />
      case "line":
        return <LineChart className="h-3.5 w-3.5 mr-1" />
    }
  }

  // Render the appropriate chart based on type
  const renderChart = () => {
    if (accounts.length === 0) {
      return (
        <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
          <PieChart className="h-16 w-16 mb-4 opacity-20" />
          <p>No float accounts found</p>
          <p className="text-sm">Create accounts to see distribution</p>
        </div>
      )
    }

    switch (chartType) {
      case "pie":
        return <Pie data={getPieChartData()} options={getPieChartOptions()} />
      case "doughnut":
        return <Doughnut data={getPieChartData()} options={getPieChartOptions()} />
      case "bar":
        return <Bar data={getBarLineChartData()} options={getBarLineChartOptions()} />
      case "line":
        return <Line data={getBarLineChartData()} options={getBarLineChartOptions()} />
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Float Distribution</CardTitle>
          <CardDescription>Distribution of float across accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading chart data</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAccounts} className="mt-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Float Distribution</CardTitle>
            <CardDescription>
              {loading
                ? "Loading float distribution data..."
                : `Total: ${formatCurrency(totalBalance)} across ${accounts.length} accounts`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tabs value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <TabsList className="h-8">
                <TabsTrigger value="doughnut" className="text-xs px-2">
                  <PieChart className="h-3.5 w-3.5 mr-1" />
                  Doughnut
                </TabsTrigger>
                <TabsTrigger value="pie" className="text-xs px-2">
                  <PieChart className="h-3.5 w-3.5 mr-1" />
                  Pie
                </TabsTrigger>
                <TabsTrigger value="bar" className="text-xs px-2">
                  <BarChart className="h-3.5 w-3.5 mr-1" />
                  Bar
                </TabsTrigger>
                <TabsTrigger value="line" className="text-xs px-2">
                  <LineChart className="h-3.5 w-3.5 mr-1" />
                  Line
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Group by: {getGroupByLabel(groupBy)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Group Chart By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setGroupBy("account_type")}>
                    Service Type
                    {groupBy === "account_type" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("branch_name")}>
                    Branch
                    {groupBy === "branch_name" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("provider")}>
                    Provider
                    {groupBy === "provider" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("status")}>
                    Status
                    {groupBy === "status" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        ) : (
          <div className="h-[350px] relative">{renderChart()}</div>
        )}

        {!loading && accounts.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sortedEntries.slice(0, 3).map(([label, value]) => (
              <div key={label} className="flex flex-col p-2 border rounded-md">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-lg font-bold">{formatCurrency(value)}</span>
                <span className="text-xs text-muted-foreground">
                  {((value / totalBalance) * 100).toFixed(1)}% of total
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to get group by label
function getGroupByLabel(groupBy: GroupByOption): string {
  switch (groupBy) {
    case "account_type":
      return "Service Type"
    case "branch_name":
      return "Branch"
    case "provider":
      return "Provider"
    case "status":
      return "Status"
    default:
      return "Service Type"
  }
}
