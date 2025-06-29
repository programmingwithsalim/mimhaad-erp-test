"use client"

import type React from "react"

import { useState } from "react"
import { CreditCard, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCardBatches, useIssuedCards } from "@/hooks/use-e-zwich"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export function EZwichCardIssuance() {
  const { batches } = useCardBatches()
  const { issueCard } = useIssuedCards()
  const { toast } = useToast()

  const [selectedBatch, setSelectedBatch] = useState<string>("")
  const [customerName, setCustomerName] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [customerIdNumber, setCustomerIdNumber] = useState<string>("")
  const [customerIdType, setCustomerIdType] = useState<string>("")
  const [cardNumber, setCardNumber] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Filter available batches (those with cards remaining)
  const availableBatches = batches?.filter((batch) => batch.quantity_available > 0) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBatch || !customerName || !customerPhone || !customerIdNumber || !customerIdType || !cardNumber) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await issueCard({
        card_number: cardNumber,
        batch_id: selectedBatch,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_id_number: customerIdNumber,
        customer_id_type: customerIdType,
      })

      toast({
        title: "Card issued successfully",
        description: `Card ${cardNumber} has been issued to ${customerName}.`,
      })

      // Reset form
      setSelectedBatch("")
      setCustomerName("")
      setCustomerPhone("")
      setCustomerIdNumber("")
      setCustomerIdType("")
      setCardNumber("")
    } catch (error) {
      toast({
        title: "Failed to issue card",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedBatchData = batches?.find((batch) => batch.id === selectedBatch)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Issue New Card
        </CardTitle>
        <CardDescription>Issue a new E-Zwich card to a customer</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Batch Selection */}
          <div className="space-y-2">
            <Label htmlFor="batch">Select Card Batch</Label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an available batch" />
              </SelectTrigger>
              <SelectContent>
                {availableBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{batch.batch_code}</span>
                      <Badge variant="secondary" className="ml-2">
                        {batch.quantity_available} available
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBatchData && (
              <div className="text-sm text-muted-foreground">
                Batch: {selectedBatchData.batch_code} • Type: {selectedBatchData.card_type} • Available:{" "}
                {selectedBatchData.quantity_available} cards
              </div>
            )}
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Enter 16-20 digit card number"
              pattern="[0-9]{16,20}"
              required
            />
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <Label className="text-base font-medium">Customer Information</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+233 XX XXX XXXX"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerIdType">ID Type</Label>
                <Select value={customerIdType} onValueChange={setCustomerIdType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="voters_id">Voter's ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerIdNumber">ID Number</Label>
                <Input
                  id="customerIdNumber"
                  value={customerIdNumber}
                  onChange={(e) => setCustomerIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || availableBatches.length === 0}>
              {isSubmitting ? "Issuing..." : "Issue Card"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
