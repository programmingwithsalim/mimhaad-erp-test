"use client"

import { Card } from "@/components/ui/card"
import type React from "react"
import { useState, useEffect } from "react"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCardBatches } from "@/hooks/use-e-zwich"

interface EZwichAddStockFormProps {
  onSuccess?: () => void
  initialData?: any
  isEdit?: boolean
}

export function EZwichAddStockForm({ onSuccess, initialData, isEdit = false }: EZwichAddStockFormProps) {
  const { toast } = useToast()
  const { createBatch, fetchBatches } = useCardBatches()

  const [date, setDate] = useState<Date>(new Date())
  const [quantity, setQuantity] = useState<string>("100")
  const [cardType, setCardType] = useState<string>("Standard")
  const [unitCost, setUnitCost] = useState<string>("10.00")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Calculate expiry date (5 years from receipt)
  const expiryDate = new Date(date)
  expiryDate.setFullYear(expiryDate.getFullYear() + 5)

  // Pre-populate form when editing
  useEffect(() => {
    if (isEdit && initialData) {
      setQuantity(initialData.quantity_received?.toString() || "100")
      setCardType(initialData.card_type || "Standard")
      setNotes(initialData.notes || "")

      // Set date from created_at or current date
      if (initialData.created_at) {
        setDate(new Date(initialData.created_at))
      }
    }
  }, [isEdit, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quantity || Number.parseInt(quantity) <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than zero.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit && initialData) {
        // Update existing batch
        const response = await fetch(`/api/e-zwich/batches/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity_received: Number.parseInt(quantity),
            card_type: cardType.toLowerCase(),
            expiry_date: expiryDate.toISOString().split("T")[0],
            notes: notes || undefined,
          }),
        })

        const result = await response.json()

        if (result.success) {
          toast({
            title: "Batch updated successfully",
            description: `Updated batch with ${quantity} E-Zwich cards.`,
          })
        } else {
          throw new Error(result.error || "Failed to update batch")
        }
      } else {
        // Create new batch
        await createBatch({
          quantity_received: Number.parseInt(quantity),
          card_type: cardType.toLowerCase(),
          expiry_date: expiryDate.toISOString().split("T")[0],
          notes: notes || undefined,
        })

        toast({
          title: "Stock added successfully",
          description: `Added ${quantity} E-Zwich cards to inventory.`,
        })
      }

      // Refresh the batches list
      await fetchBatches()

      // Reset form if creating new batch
      if (!isEdit) {
        setQuantity("100")
        setNotes("")
      }

      // Close dialog if callback provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: isEdit ? "Failed to update batch" : "Failed to add stock",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Receipt Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardType">Card Type</Label>
          <Select value={cardType} onValueChange={setCardType}>
            <SelectTrigger>
              <SelectValue placeholder="Select card type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
              <SelectItem value="Corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitCost">Unit Cost (GHS)</Label>
          <Input
            id="unitCost"
            type="number"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalCost">Total Cost (GHS)</Label>
          <Input
            id="totalCost"
            value={(Number.parseFloat(unitCost) * Number.parseInt(quantity || "0")).toFixed(2)}
            readOnly
            disabled
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiryDate">Card Expiry Date</Label>
        <Input id="expiryDate" value={format(expiryDate, "PPP")} readOnly disabled />
        <p className="text-xs text-muted-foreground">Cards will expire 5 years from receipt date</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter any additional information about this stock receipt"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>GL Posting Preview</Label>
        <Card className="p-4">
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold">Debit</p>
                <p>E-Zwich Card Stock (Asset)</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Amount</p>
                <p>GHS {(Number.parseFloat(unitCost) * Number.parseInt(quantity || "0")).toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-semibold">Credit</p>
                <p>Accounts Payable (Liability)</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Amount</p>
                <p>GHS {(Number.parseFloat(unitCost) * Number.parseInt(quantity || "0")).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? (isEdit ? "Updating..." : "Adding Stock...") : isEdit ? "Update Stock" : "Add Stock"}
        </Button>
      </div>
    </form>
  )
}
