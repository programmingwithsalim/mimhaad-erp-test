"use client"

import type React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { useToast } from "@/components/ui/use-toast"
import { Calculator, Building2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"

const commissionSchema = z.object({
  source: z.string().min(1, "Partner is required"),
  sourceName: z.string().min(1, "Partner name is required"),
  reference: z.string().min(1, "Reference is required"),
  month: z.string().min(1, "Month is required"),
  amount: z.number().optional(),
  transactionVolume: z.number().min(1, "Transaction volume is required"),
  commissionRate: z.number().min(0.01, "Commission rate is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("paid"), // Default to paid
})

type CommissionFormData = z.infer<typeof commissionSchema>

interface CommissionFormProps {
  onSuccess?: () => void
}

const COMMISSION_PARTNERS = [
  { value: "mtn", label: "MTN Mobile Money", code: "MTN" },
  { value: "vodafone", label: "Vodafone Cash", code: "VOD" },
  { value: "airteltigo", label: "AirtelTigo Money", code: "ATL" },
  { value: "jumia", label: "Jumia Pay", code: "JUM" },
  { value: "vra", label: "VRA (Electricity)", code: "VRA" },
  { value: "ecg", label: "ECG (Electricity)", code: "ECG" },
  { value: "gwcl", label: "Ghana Water Company", code: "GWC" },
  { value: "gcb", label: "GCB Bank", code: "GCB" },
  { value: "ecobank", label: "Ecobank Ghana", code: "ECO" },
]

export default function CommissionForm({ onSuccess }: CommissionFormProps) {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CommissionFormData>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      transactionVolume: 0,
      commissionRate: 0,
      month: format(new Date(), "yyyy-MM"),
      status: "paid", // Default to paid
    },
  })

  const watchedSource = watch("source")
  const watchedVolume = watch("transactionVolume")
  const watchedRate = watch("commissionRate")

  // Auto-calculate amount when volume or rate changes
  const calculatedAmount = watchedVolume && watchedRate ? watchedVolume * watchedRate : 0

  const handlePartnerChange = (value: string) => {
    const partner = COMMISSION_PARTNERS.find((p) => p.value === value)
    if (partner) {
      setValue("source", value)
      setValue("sourceName", partner.label)

      // Generate reference number with properly formatted month
      const monthStr = watch("month") || format(new Date(), "yyyy-MM")
      const formattedMonthStr = monthStr.replace("-", "")
      const reference = `${partner.code}-${formattedMonthStr}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      setValue("reference", reference)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 5MB",
        })
        return
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]

      if (!allowedTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select an image, PDF, or Word document",
        })
        return
      }

      setUploadedFile(file)

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setFilePreview(null)
      }
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setFilePreview(null)
    // Reset the file input
    const fileInput = document.getElementById("receipt-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const onSubmit = async (data: CommissionFormData) => {
    setIsSubmitting(true)
    setFormError(null)

    try {
      // Ensure we have a calculated amount
      if (calculatedAmount <= 0) {
        throw new Error("Please enter valid transaction volume and commission rate")
      }

      // Convert month from "YYYY-MM" to "YYYY-MM-01" for PostgreSQL date format
      const formattedMonth = data.month.includes("-") ? `${data.month}-01` : data.month

      // Use real user data if available, otherwise use meaningful defaults
      const userData = user || {
        id: `user-${Date.now()}`,
        username: "System User",
        name: "System User",
        branchId: `branch-${Date.now()}`,
        branchName: "Default Branch",
        role: "manager",
      }

      console.log("📝 [COMMISSION] Submitting with user data:", userData)

      // Create JSON payload instead of FormData to avoid parsing issues
      const payload = {
        source: data.source,
        sourceName: data.sourceName,
        reference: data.reference,
        month: formattedMonth,
        amount: calculatedAmount,
        transactionVolume: data.transactionVolume,
        commissionRate: data.commissionRate,
        description: data.description || "",
        notes: data.notes || "",
        status: "paid",
        createdBy: userData.id,
        createdByName: userData.username || userData.name,
        branchId: userData.branchId,
        branchName: userData.branchName,
        userRole: userData.role,
      }

      console.log("📝 [COMMISSION] Payload:", JSON.stringify(payload, null, 2))

      const response = await fetch("/api/commissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userData.id,
          "x-user-name": userData.username || userData.name,
          "x-user-role": userData.role || "manager",
          "x-branch-id": userData.branchId,
          "x-branch-name": userData.branchName || "Unknown Branch",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to create commission: ${response.status}`)
      }

      const result = await response.json()
      console.log("✅ [COMMISSION] Created successfully:", result)

      toast({
        title: "Commission Created",
        description: `Commission ${data.reference} has been created successfully.`,
      })

      reset()
      setUploadedFile(null)
      setFilePreview(null)

      if (onSuccess) {
        console.log("📝 [COMMISSION] Calling onSuccess callback")
        onSuccess()
      }
    } catch (error) {
      console.error("❌ [COMMISSION] Error creating commission:", error)
      setFormError(error instanceof Error ? error.message : "Failed to create commission")
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create commission",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Partner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partner Information
          </CardTitle>
          <CardDescription>Select the service partner and commission details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Service Partner *</Label>
              <Select onValueChange={handlePartnerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_PARTNERS.map((partner) => (
                    <SelectItem key={partner.value} value={partner.value}>
                      {partner.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.source && <p className="text-sm text-red-500">{errors.source.message}</p>}
              <input type="hidden" {...register("source")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceName">Partner Name *</Label>
              <Input {...register("sourceName")} placeholder="Auto-filled when partner selected" readOnly />
              {errors.sourceName && <p className="text-sm text-red-500">{errors.sourceName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number *</Label>
              <Input {...register("reference")} placeholder="Auto-generated" />
              {errors.reference && <p className="text-sm text-red-500">{errors.reference.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Commission Month *</Label>
              <Input type="month" {...register("month")} placeholder="YYYY-MM" />
              {errors.month && <p className="text-sm text-red-500">{errors.month.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Transaction Details
          </CardTitle>
          <CardDescription>Enter transaction volume and commission calculation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionVolume">Transaction Volume *</Label>
              <Input
                type="number"
                {...register("transactionVolume", { valueAsNumber: true })}
                placeholder="Enter volume"
              />
              {errors.transactionVolume && <p className="text-sm text-red-500">{errors.transactionVolume.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate *</Label>
              <Input
                type="number"
                {...register("commissionRate", { valueAsNumber: true })}
                placeholder="Enter rate"
                step="0.01"
              />
              {errors.commissionRate && <p className="text-sm text-red-500">{errors.commissionRate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Calculated Amount</Label>
              <Input type="number" value={calculatedAmount.toFixed(2)} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input {...register("description")} placeholder="Enter description" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input {...register("notes")} placeholder="Enter any notes" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Create Commission"}
      </Button>
    </form>
  )
}
