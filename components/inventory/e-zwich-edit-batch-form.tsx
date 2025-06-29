"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCardBatches } from "@/hooks/use-e-zwich"

interface EZwichEditBatchFormProps {
  batch: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function EZwichEditBatchForm({ batch, onSuccess, onCancel }: EZwichEditBatchFormProps) {
  const { toast } = useToast()
  const { fetchBatches } = useCardBatches()

  const [formData, setFormData] = useState({
    batch_code: "",
    quantity_received: "",
    card_type: "standard",
    expiry_date: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-populate form with batch data
  useEffect(() => {
    if (batch) {
      setFormData({
        batch_code: batch.batch_code || "",
        quantity_received: batch.quantity_received?.toString() || "",
        card_type: batch.card_type || "standard",
        expiry_date: batch.expiry_date ? batch.expiry_date.split("T")[0] : "",
        notes: batch.notes || "",
      })
    }
  }, [batch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.quantity_received || Number.parseInt(formData.quantity_received) <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity greater than zero.",
        variant: "destructive",
      })
      return
    }

    // Check if new quantity is less than issued cards
    const quantityIssued = batch.quantity_received - batch.quantity_available
    if (Number.parseInt(formData.quantity_received) < quantityIssued) {
      toast({
        title: "Invalid quantity",
        description: `Cannot reduce quantity below ${quantityIssued} (number of cards already issued).`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/e-zwich/batches/${batch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_code: formData.batch_code,
          quantity_received: Number.parseInt(formData.quantity_received),
          card_type: formData.card_type,
          expiry_date: formData.expiry_date,
          notes: formData.notes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Batch updated successfully",
          description: `Updated batch ${formData.batch_code}.`,
        })

        // Refresh the batches list
        await fetchBatches()

        // Close the form
        if (onSuccess) {
          onSuccess()
        }
      } else {
        throw new Error(result.error || "Failed to update batch")
      }
    } catch (error) {
      toast({
        title: "Failed to update batch",
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
          <Label htmlFor="batch_code">Batch Code *</Label>
          <Input
            id="batch_code"
            value={formData.batch_code}
            onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
            required
            disabled // Don't allow editing batch code
            className="bg-gray-50"
          />
          <p className="text-xs text-muted-foreground">Batch code cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity_received">Quantity Received *</Label>
          <Input
            id="quantity_received"
            type="number"
            value={formData.quantity_received}
            onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
            min={batch.quantity_received - batch.quantity_available} // Minimum is issued cards
            required
          />
          <p className="text-xs text-muted-foreground">
            Minimum: {batch.quantity_received - batch.quantity_available} (cards already issued)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="card_type">Card Type</Label>
          <Select value={formData.card_type} onValueChange={(value) => setFormData({ ...formData, card_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select card type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry_date">Expiry Date</Label>
          <Input
            id="expiry_date"
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Enter any additional information about this batch"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Updating..." : "Update Batch"}
        </Button>
      </div>
    </form>
  )
}
