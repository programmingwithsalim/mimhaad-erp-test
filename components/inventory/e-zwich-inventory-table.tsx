"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ArrowUpDown, ChevronDown, Download, Filter, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useCardBatches, useIssuedCards } from "@/hooks/use-e-zwich"

interface EZwichInventoryTableProps {
  limit?: number
}

export function EZwichInventoryTable({ limit }: EZwichInventoryTableProps) {
  const [sorting, setSorting] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  // Use database hooks
  const { batches, loading: batchesLoading } = useCardBatches()
  const { cards, loading: cardsLoading } = useIssuedCards()

  // Combine batches and card issuances into inventory data
  const inventoryData = [
    // Add batch receipts
    ...batches.map((batch) => ({
      id: batch.id,
      date: batch.created_at,
      type: "Stock Addition",
      quantity: batch.quantity_received,
      batchNumber: batch.batch_code,
      receivedBy: batch.created_by,
      notes: batch.notes || "Card batch received",
      batchData: batch, // Store original batch data for editing
    })),
    // Add card issuances
    ...cards.map((card) => ({
      id: card.id,
      date: card.created_at,
      type: "Card Issuance",
      quantity: -1,
      batchNumber: card.batch_id,
      issuedBy: card.issued_by,
      customerName: card.customer_name,
      notes: `Card issued to ${card.customer_name}`,
      cardData: card, // Store original card data for editing
    })),
  ]

  // Filter and sort the data
  const filteredData = inventoryData
    .filter((item) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          item.id.toLowerCase().includes(query) ||
          item.batchNumber.toLowerCase().includes(query) ||
          item.notes.toLowerCase().includes(query) ||
          (item.customerName && item.customerName.toLowerCase().includes(query))
        )
      }
      return true
    })
    .filter((item) => {
      // Apply type filter
      if (selectedTypes.length > 0) {
        return selectedTypes.includes(item.type)
      }
      return true
    })
    .sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sorting === "asc" ? dateA - dateB : dateB - dateA
    })

  // Limit the number of rows if specified
  const displayData = limit ? filteredData.slice(0, limit) : filteredData

  // Get unique transaction types for filter
  const transactionTypes = Array.from(new Set(inventoryData.map((item) => item.type)))

  // Handle edit action
  const handleEdit = (item: any) => {
    if (item.type === "Stock Addition" && item.batchData) {
      // Handle batch editing
      console.log("Edit batch:", item.batchData)
      // You can emit an event or call a parent function to open edit dialog
    } else if (item.type === "Card Issuance" && item.cardData) {
      // Handle card issuance editing
      console.log("Edit card issuance:", item.cardData)
      // You can emit an event or call a parent function to open edit dialog
    }
  }

  // Handle delete action
  const handleDelete = (item: any) => {
    if (item.type === "Stock Addition" && item.batchData) {
      // Handle batch deletion
      console.log("Delete batch:", item.batchData)
      // You can emit an event or call a parent function to open delete dialog
    } else if (item.type === "Card Issuance" && item.cardData) {
      // Handle card issuance deletion
      console.log("Delete card issuance:", item.cardData)
      // You can emit an event or call a parent function to open delete dialog
    }
  }

  if (batchesLoading || cardsLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {selectedTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-2 rounded-sm px-1">
                    {selectedTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Transaction Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {transactionTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, type])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== type))
                    }
                  }}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedTypes([])} disabled={selectedTypes.length === 0}>
                Clear Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!limit && (
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSorting(sorting === "asc" ? "desc" : "asc")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-medium">{item.id.slice(0, 8)}...</TableCell>
                  <TableCell>{format(new Date(item.date), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.type === "Stock Addition"
                          ? "default"
                          : item.type === "Card Issuance"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={item.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>{item.receivedBy || item.issuedBy}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.notes}>
                    {item.notes}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(item)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Print Record</DropdownMenuItem>
                          {item.type === "Stock Addition" && <DropdownMenuItem>View Receipt</DropdownMenuItem>}
                          {item.type === "Card Issuance" && <DropdownMenuItem>View Customer</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!limit && displayData.length > 0 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
