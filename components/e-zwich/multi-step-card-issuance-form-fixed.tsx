"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { Loader2, CreditCard, User, MapPin, FileText, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const cardIssuanceSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  partnerBank: z.string().min(1, "Partner bank is required"),
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  idType: z.string().min(1, "ID type is required"),
  idNumber: z.string().min(1, "ID number is required"),
  idExpiryDate: z.string().optional(),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  postalCode: z.string().optional(),
  fee: z.number().min(0, "Fee must be positive"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  reference: z.string().optional(),
})

type CardIssuanceFormData = z.infer<typeof cardIssuanceSchema>

interface MultiStepCardIssuanceFormProps {
  onSuccess?: () => void
}

const steps = [
  { id: 1, title: "Card Details", icon: CreditCard },
  { id: 2, title: "Customer Info", icon: User },
  { id: 3, title: "Address", icon: MapPin },
  { id: 4, title: "Payment", icon: FileText },
  { id: 5, title: "Review", icon: CheckCircle },
]

const partnerBanks = [
  "GCB Bank",
  "Ecobank Ghana",
  "Standard Chartered",
  "Absa Bank",
  "Fidelity Bank",
  "CAL Bank",
  "UMB Bank",
  "ADB Bank",
]

const regions = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Brong Ahafo",
  "Western North",
  "Ahafo",
  "Bono East",
  "North East",
  "Savannah",
  "Oti",
]

export function MultiStepCardIssuanceFormFixed({ onSuccess }: MultiStepCardIssuanceFormProps) {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CardIssuanceFormData>({
    resolver: zodResolver(cardIssuanceSchema),
    defaultValues: {
      fee: 15,
      paymentMethod: "cash",
      reference: "",
    },
  })

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: CardIssuanceFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information not available. Please log in again.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("🎫 [E-ZWICH] Submitting card issuance with user:", user)

      // Create FormData for file upload compatibility
      const formData = new FormData()

      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value.toString())
        }
      })

      // Add user context - IMPORTANT: Use actual user IDs, not "System"
      formData.append("user_id", user.id) // This is the key fix
      formData.append("branch_id", user.branchId)
      formData.append("processed_by", user.username || user.name)
      formData.append("branchName", user.branchName || "Unknown Branch")

      console.log("🎫 [E-ZWICH] FormData entries:")
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }

      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
          "x-user-name": user.username || user.name,
          "x-user-role": user.role,
          "x-branch-id": user.branchId,
          "x-branch-name": user.branchName || "Unknown Branch",
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "E-Zwich card issued successfully",
        })
        form.reset()
        setCurrentStep(1)
        onSuccess?.()
      } else {
        throw new Error(result.error || "Failed to issue card")
      }
    } catch (error) {
      console.error("Error processing E-Zwich card issuance:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to issue card",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  {...form.register("cardNumber")}
                  placeholder="Enter card number"
                  maxLength={10}
                />
                {form.formState.errors.cardNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.cardNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="partnerBank">Partner Bank *</Label>
                <Select
                  value={form.watch("partnerBank")}
                  onValueChange={(value) => form.setValue("partnerBank", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.partnerBank && (
                  <p className="text-sm text-destructive">{form.formState.errors.partnerBank.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input id="customerName" {...form.register("customerName")} placeholder="Enter full name" />
                {form.formState.errors.customerName && (
                  <p className="text-sm text-destructive">{form.formState.errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input id="phoneNumber" {...form.register("phoneNumber")} placeholder="Enter phone number" />
                {form.formState.errors.phoneNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="Enter email address" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
                {form.formState.errors.dateOfBirth && (
                  <p className="text-sm text-destructive">{form.formState.errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && (
                  <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idType">ID Type *</Label>
                <Select value={form.watch("idType")} onValueChange={(value) => form.setValue("idType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ghana_card">Ghana Card</SelectItem>
                    <SelectItem value="voters_id">Voter's ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.idType && (
                  <p className="text-sm text-destructive">{form.formState.errors.idType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input id="idNumber" {...form.register("idNumber")} placeholder="Enter ID number" />
                {form.formState.errors.idNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.idNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idExpiryDate">ID Expiry Date (Optional)</Label>
                <Input id="idExpiryDate" type="date" {...form.register("idExpiryDate")} />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input id="addressLine1" {...form.register("addressLine1")} placeholder="Enter address" />
                {form.formState.errors.addressLine1 && (
                  <p className="text-sm text-destructive">{form.formState.errors.addressLine1.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input id="addressLine2" {...form.register("addressLine2")} placeholder="Enter additional address" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" {...form.register("city")} placeholder="Enter city" />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select value={form.watch("region")} onValueChange={(value) => form.setValue("region", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.region && (
                    <p className="text-sm text-destructive">{form.formState.errors.region.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                  <Input id="postalCode" {...form.register("postalCode")} placeholder="Enter postal code" />
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Fee (GHS) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("fee", { valueAsNumber: true })}
                  placeholder="15.00"
                />
                {form.formState.errors.fee && (
                  <p className="text-sm text-destructive">{form.formState.errors.fee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={form.watch("paymentMethod")}
                  onValueChange={(value) => form.setValue("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="momo">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.paymentMethod && (
                  <p className="text-sm text-destructive">{form.formState.errors.paymentMethod.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input id="reference" {...form.register("reference")} placeholder="Enter reference" />
              </div>
            </div>
          </div>
        )

      case 5:
        const formData = form.getValues()
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Card Issuance Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Card Number:</strong> {formData.cardNumber}
              </div>
              <div>
                <strong>Partner Bank:</strong> {formData.partnerBank}
              </div>
              <div>
                <strong>Customer Name:</strong> {formData.customerName}
              </div>
              <div>
                <strong>Phone:</strong> {formData.phoneNumber}
              </div>
              <div>
                <strong>Email:</strong> {formData.email || "Not provided"}
              </div>
              <div>
                <strong>Date of Birth:</strong> {formData.dateOfBirth}
              </div>
              <div>
                <strong>Gender:</strong> {formData.gender}
              </div>
              <div>
                <strong>ID Type:</strong> {formData.idType}
              </div>
              <div>
                <strong>ID Number:</strong> {formData.idNumber}
              </div>
              <div>
                <strong>Address:</strong> {formData.addressLine1}
                {formData.addressLine2 && `, ${formData.addressLine2}`}
              </div>
              <div>
                <strong>City:</strong> {formData.city}
              </div>
              <div>
                <strong>Region:</strong> {formData.region}
              </div>
              <div>
                <strong>Fee:</strong> GHS {formData.fee?.toFixed(2)}
              </div>
              <div>
                <strong>Payment Method:</strong> {formData.paymentMethod}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const progress = (currentStep / steps.length) * 100

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          E-Zwich Card Issuance
        </CardTitle>
        <CardDescription>Issue a new E-Zwich card for a customer</CardDescription>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep} of {steps.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step Navigation */}
          <div className="flex justify-between items-center mb-6">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-2 ${
                    currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`rounded-full p-2 ${
                      currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </div>
              )
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">{renderStepContent()}</div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing Card...
                  </>
                ) : (
                  "Issue Card"
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
