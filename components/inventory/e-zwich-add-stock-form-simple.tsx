"use client"

import type React from "react"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCardBatches } from "@/hooks/use-e-zwich"

interface EZwichAddStockFormSimpleProps {
  onSuccess?: () => void
}

export function EZwichAddStockFormSimple({ onSuccess }: EZwichAddStockFormSimpleProps) {
  const { toast } = useToast()
  const { createBatch, fetchBatches } = useCardBatches()

  const [quantity, setQuantity] = useState<string>("100")
  const [cardType, setCardType] = useState<string>("standard")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

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
      // Create new batch with GL integration
      const result = await createBatch({
        quantity_received: Number.parseInt(quantity),
        card_type: cardType,
        expiry_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 5 years from now
        notes: `Batch added via simple form - ${cardType} cards`,
      })

      console.log("Batch creation result:", result)

      toast({
        title: "Stock added successfully",
        description: `Added ${quantity} ${cardType} E-Zwich cards to inventory.`,
      })

      // Refresh the batches list
      await fetchBatches()

      // Reset form
      setQuantity("100")
      setCardType("standard")

      // Close dialog if callback provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error adding stock:", error)
      toast({
        title: "Failed to add stock",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCost = Number.parseInt(quantity || "0") * 10 // GHS 10 per card

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            max="1000"
            required
            placeholder="Enter quantity"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardType">Card Type</Label>
          <Select value={cardType} onValueChange={setCardType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-3 bg-muted/50">
        <div className="flex justify-between items-center text-sm">
          <span>Total Cost:</span>
          <span className="font-semibold">GHS {totalCost.toFixed(2)}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">GL: Debit Inventory, Credit Accounts Payable</div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Adding..." : "Add Stock"}
        </Button>
      </div>
    </form>
  )
}
