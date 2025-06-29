"use client"

import { useMemo } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Commission } from "@/lib/commission-types"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO, startOfMonth, addMonths, isSameMonth } from "date-fns"

interface CommissionTrendChartProps {
  data: Commission[]
  months?: number
}

export function CommissionTrendChart({ data, months = 12 }: CommissionTrendChartProps) {
  // Process data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Generate last X months
    const today = new Date()
    const monthsArray = Array.from({ length: months }).map((_, i) => {
      const date = startOfMonth(addMonths(today, -months + i + 1))
      return {
        month: date,
        monthStr: format(date, "MMM yyyy"),
        amount: 0,
        count: 0,
      }
    })

    // Group commissions by month
    data.forEach((commission) => {
      if (!commission.month) return

      const commissionDate = parseISO(commission.month)
      const monthIndex = monthsArray.findIndex((m) => isSameMonth(m.month, commissionDate))

      if (monthIndex >= 0) {
        monthsArray[monthIndex].amount += commission.amount || 0
        monthsArray[monthIndex].count += 1
      }
    })

    return monthsArray.map((item) => ({
      month: item.monthStr,
      amount: item.amount,
      count: item.count,
    }))
  }, [data, months])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No data available for chart</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" tickFormatter={(value) => `₵${value}`} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}`} />
        <Tooltip
          formatter={(value, name) => {
            if (name === "Amount") return formatCurrency(Number(value))
            return value
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="amount"
          name="Amount"
          stroke="#4f46e5"
          activeDot={{ r: 8 }}
          strokeWidth={2}
        />
        <Line yAxisId="right" type="monotone" dataKey="count" name="Count" stroke="#10b981" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}
