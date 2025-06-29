"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { CreditCard, RefreshCw, Upload, User, Hash } from "lucide-react"

interface CardIssuanceFormProps {
  onSuccess?: (data: any) => void
}

export function EnhancedCardIssuanceForm({ onSuccess }: CardIssuanceFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    // Bio Information
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    date_of_birth: "",
    gender: "",
    address: "",

    // ID Information
    id_type: "",
    id_number: "",
    id_expiry_date: "",

    // Card Details
    card_type: "",
    initial_deposit: "",

    // Image Upload
    customer_photo: null as File | null,
    id_front_image: null as File | null,
    id_back_image: null as File | null,

    // Additional
    notes: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: string, file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (
      !formData.customer_name ||
      !formData.customer_phone ||
      !formData.id_type ||
      !formData.id_number ||
      !formData.card_type
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Create FormData for file uploads
      const submitData = new FormData()

      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && typeof value === "string") {
          submitData.append(key, value)
        }
      })

      // Add files
      if (formData.customer_photo) {
        submitData.append("customer_photo", formData.customer_photo)
      }
      if (formData.id_front_image) {
        submitData.append("id_front_image", formData.id_front_image)
      }
      if (formData.id_back_image) {
        submitData.append("id_back_image", formData.id_back_image)
      }

      // Add user and branch info
      submitData.append("user_id", user.id)
      submitData.append("branch_id", user.branchId)
      submitData.append("processed_by", user.name || user.id)

      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        body: submitData,
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Card Issuance Successful",
          description: "E-Zwich card has been issued successfully",
        })

        // Reset form
        setFormData({
          customer_name: "",
          customer_phone: "",
          customer_email: "",
          date_of_birth: "",
          gender: "",
          address: "",
          id_type: "",
          id_number: "",
          id_expiry_date: "",
          card_type: "",
          initial_deposit: "",
          customer_photo: null,
          id_front_image: null,
          id_back_image: null,
          notes: "",
        })

        // Call success callback
        if (onSuccess) {
          onSuccess({
            id: result.cardId || `card-${Date.now()}`,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            card_type: formData.card_type,
            initial_deposit: formData.initial_deposit,
            type: "card_issuance",
          })
        }
      } else {
        toast({
          title: "Card Issuance Failed",
          description: result.error || "Failed to issue card",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error issuing card:", error)
      toast({
        title: "Card Issuance Failed",
        description: "Failed to issue card",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          E-Zwich Card Issuance
        </CardTitle>
        <CardDescription>Issue a new E-Zwich card with complete customer information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <User className="h-5 w-5" />
              Bio Information
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange("customer_name", e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number *</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">Email Address</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange("customer_email", e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ID Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <Hash className="h-5 w-5" />
              ID Information
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="id_type">ID Type *</Label>
                <Select
                  value={formData.id_type}
                  onValueChange={(value) => handleInputChange("id_type", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ghana_card">Ghana Card</SelectItem>
                    <SelectItem value="voters_id">Voter's ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="nhis">NHIS Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_number">ID Number *</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => handleInputChange("id_number", e.target.value)}
                  placeholder="Enter ID number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_expiry_date">ID Expiry Date</Label>
                <Input
                  id="id_expiry_date"
                  type="date"
                  value={formData.id_expiry_date}
                  onChange={(e) => handleInputChange("id_expiry_date", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <Upload className="h-5 w-5" />
              Image Upload
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="customer_photo">Customer Photo</Label>
                <Input
                  id="customer_photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange("customer_photo", e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">Upload customer's passport photo</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_front_image">ID Front Image</Label>
                <Input
                  id="id_front_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange("id_front_image", e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">Upload front side of ID</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_back_image">ID Back Image</Label>
                <Input
                  id="id_back_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange("id_back_image", e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">Upload back side of ID</p>
              </div>
            </div>
          </div>

          {/* Card Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
              <CreditCard className="h-5 w-5" />
              Card Details
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="card_type">Card Type *</Label>
                <Select
                  value={formData.card_type}
                  onValueChange={(value) => handleInputChange("card_type", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Card</SelectItem>
                    <SelectItem value="premium">Premium Card</SelectItem>
                    <SelectItem value="student">Student Card</SelectItem>
                    <SelectItem value="senior">Senior Citizen Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_deposit">Initial Deposit (GHS)</Label>
                <Input
                  id="initial_deposit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.initial_deposit}
                  onChange={(e) => handleInputChange("initial_deposit", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional notes or comments..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Issuing Card...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Issue E-Zwich Card
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
