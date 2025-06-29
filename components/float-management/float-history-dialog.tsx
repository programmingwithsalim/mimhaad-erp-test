"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface FloatHistoryEntry {
  id: string
  date: string
  amount: number
  balance: number
  type: "allocation" | "deallocation" | "usage"
  method?: string
  reference: string
  notes?: string
}

interface FloatHistoryDialogProps {
  branchId: string
}

export function FloatHistoryDialog({ branchId }: FloatHistoryDialogProps) {
  const [history, setHistory] = useState<FloatHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to fetch history
    setTimeout(() => {
      // This would normally be a fetch call to your API
      const mockHistory = generateMockHistory(branchId)
      setHistory(mockHistory)
      setIsLoading(false)
    }, 500)
  }, [branchId])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "allocation":
        return <Badge className="bg-green-500">Allocation</Badge>
      case "deallocation":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-600">
            Deallocation
          </Badge>
        )
      case "usage":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600">
            Usage
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="relative h-10 w-10">
          <div className="absolute h-full w-full animate-ping rounded-full bg-primary/10"></div>
          <div className="absolute h-full w-full animate-pulse rounded-full bg-primary/30"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length > 0 ? (
            history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="text-xs">
                    {new Date(entry.date).toLocaleDateString("en-GB")}
                    <div className="text-muted-foreground">
                      {new Date(entry.date).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getTypeBadge(entry.type)}
                  {entry.method && <div className="mt-1 text-xs text-muted-foreground">via {entry.method}</div>}
                </TableCell>
                <TableCell
                  className={
                    entry.type === "allocation"
                      ? "text-green-600"
                      : entry.type === "deallocation" || entry.type === "usage"
                        ? "text-red-600"
                        : ""
                  }
                >
                  {entry.type === "allocation" ? "+" : "-"}
                  {entry.amount.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}
                </TableCell>
                <TableCell>{entry.balance.toLocaleString("en-GH", { style: "currency", currency: "GHS" })}</TableCell>
                <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {entry.notes || "-"}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No history available for this branch.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// Function to generate mock history data
function generateMockHistory(branchId: string): FloatHistoryEntry[] {
  // Start with an initial balance
  let currentBalance = 50000
  const history: FloatHistoryEntry[] = []

  // Generate entries for the past 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    // Skip some days randomly to make it more realistic
    if (Math.random() > 0.6 && i > 0) continue

    // Determine what type of transaction to generate
    const rand = Math.random()
    if (rand < 0.4 || i === 30) {
      // Allocation (more common at the beginning of the month)
      const amount = Math.round(Math.random() * 10000) + 5000
      currentBalance += amount

      history.push({
        id: `alloc-${i}`,
        date: date.toISOString(),
        amount,
        balance: currentBalance,
        type: "allocation",
        method: ["bank-transfer", "cash", "internal"][Math.floor(Math.random() * 3)],
        reference: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
        notes: i % 3 === 0 ? "Monthly allocation" : i % 5 === 0 ? "Additional float requested by branch" : undefined,
      })
    } else if (rand < 0.6 && currentBalance > 10000) {
      // Deallocation (less common)
      const amount = Math.round(Math.random() * 5000) + 2000
      currentBalance -= amount

      history.push({
        id: `dealloc-${i}`,
        date: date.toISOString(),
        amount,
        balance: currentBalance,
        type: "deallocation",
        method: "internal",
        reference: `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
        notes: "Excess float returned to HQ",
      })
    } else {
      // Usage
      const amount = Math.round(Math.random() * 3000) + 1000
      currentBalance -= amount

      // Make sure we don't go negative
      if (currentBalance < amount) {
        currentBalance += amount // Reverse the deduction
        continue // Skip this entry
      }

      history.push({
        id: `usage-${i}`,
        date: date.toISOString(),
        amount,
        balance: currentBalance,
        type: "usage",
        reference: `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
        notes: i % 2 === 0 ? "Daily operations" : "Customer transactions",
      })
    }
  }

  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
