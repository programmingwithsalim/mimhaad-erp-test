"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface FloatComparisonChartProps {
  data: Array<{
    name: string
    currentBalance: number
    minThreshold: number
    maxThreshold: number
  }>
}

export function FloatComparisonChart({ data }: FloatComparisonChartProps) {
  const formatCurrency = (value: number) => {
    return `GHS ${(value / 1000).toFixed(0)}K`
  }

  const chartConfig = {
    currentBalance: {
      label: "Current Balance",
      color: "hsl(var(--chart-1))",
    },
    minThreshold: {
      label: "Min Threshold",
      color: "hsl(var(--chart-2))",
    },
    maxThreshold: {
      label: "Max Threshold",
      color: "hsl(var(--chart-3))",
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Float Balance Comparison</CardTitle>
        <CardDescription>Current balances vs thresholds across accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) => [formatCurrency(value), ""]}
              />
              <Legend />
              <Bar
                dataKey="currentBalance"
                fill="var(--color-currentBalance)"
                name="Current Balance"
                radius={[2, 2, 0, 0]}
              />
              <Bar dataKey="minThreshold" fill="var(--color-minThreshold)" name="Min Threshold" radius={[2, 2, 0, 0]} />
              <Bar dataKey="maxThreshold" fill="var(--color-maxThreshold)" name="Max Threshold" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
