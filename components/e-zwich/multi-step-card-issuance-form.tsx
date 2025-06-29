"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { CreditCard, Loader2, User, MapPin, FileText, Camera, ArrowLeft, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const formSchema = z.object({
  cardNumber: z
    .string()
    .min(1, "Card number is required")
    .max(10, "Card number must be 10 digits or less")
    .regex(/^\d+$/, "Card number must contain only digits"),
  partnerBank: z.string().min(1, "Partner bank is required"),
  customerName: z.string().min(2, "Customer name is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], { message: "Gender is required" }),
  addressLine1: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  idType: z.enum(["ghana_card", "voters_id", "passport", "drivers_license"], { message: "ID type is required" }),
  idNumber: z.string().min(1, "ID number is required"),
  fee: z.coerce.number().min(0, "Fee cannot be negative"),
  paymentMethod: z.enum(["cash", "momo", "bank_transfer"], {
    required_error: "Please select a payment method",
  }),
  customerPhoto: z.string().optional(),
  idPhoto: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const ghanaRegions = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Brong Ahafo",
]

interface MultiStepCardIssuanceFormProps {
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

export function MultiStepCardIssuanceForm({ onSuccess, onCancel }: MultiStepCardIssuanceFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [partnerBanks, setPartnerBanks] = useState<any[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [feeConfig, setFeeConfig] = useState<any>(null)
  const [customerPhotoPreview, setCustomerPhotoPreview] = useState<string>("")
  const [idPhotoPreview, setIdPhotoPreview] = useState<string>("")

  const totalSteps = 4

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardNumber: "",
      partnerBank: "",
      customerName: "",
      phoneNumber: "",
      email: "",
      dateOfBirth: "",
      gender: "male",
      addressLine1: "",
      city: "",
      region: "",
      idType: "ghana_card",
      idNumber: "",
      fee: 15,
      paymentMethod: "cash",
      customerPhoto: "",
      idPhoto: "",
    },
  })

  // Load fee configuration
  useEffect(() => {
    const loadFeeConfig = async () => {
      try {
        const response = await fetch("/api/settings/fee-config/e-zwich?transactionType=card_issuance")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setFeeConfig(data.config)
            form.setValue("fee", Number(data.config.fee_value || 15))
          }
        }
      } catch (error) {
        console.error("Error loading fee config:", error)
      }
    }

    loadFeeConfig()
  }, [form])

  // Load E-Zwich partner banks
  const loadPartnerBanks = async () => {
    if (!user?.branchId) return

    setLoadingBanks(true)
    try {
      console.log("🔍 [E-ZWICH] Loading partner banks for branch:", user.branchId)

      const response = await fetch(`/api/float-accounts/ezwich-partners?branchId=${user.branchId}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [E-ZWICH] API Error:", errorText)
        throw new Error(`Failed to load partner banks: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log("✅ [E-ZWICH] Loaded partner banks:", data.accounts)
        setPartnerBanks(data.accounts || [])
      } else {
        throw new Error(data.error || "Failed to load E-Zwich partner banks")
      }
    } catch (error) {
      console.error("❌ [E-ZWICH] Error loading partner banks:", error)
      setPartnerBanks([])
      toast({
        title: "Error",
        description: "Failed to load E-Zwich partner banks",
        variant: "destructive",
      })
    } finally {
      setLoadingBanks(false)
    }
  }

  useEffect(() => {
    loadPartnerBanks()
  }, [user?.branchId])

  const handleImageUpload = (file: File, type: "customer" | "id") => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (type === "customer") {
        setCustomerPhotoPreview(base64)
        form.setValue("customerPhoto", base64)
      } else {
        setIdPhotoPreview(base64)
        form.setValue("idPhoto", base64)
      }
    }
    reader.readAsDataURL(file)
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)

    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(currentStep - 1)
  }

  const getFieldsForStep = (step: number): (keyof FormValues)[] => {
    switch (step) {
      case 1:
        return ["cardNumber", "partnerBank"]
      case 2:
        return ["customerName", "phoneNumber", "dateOfBirth", "gender"]
      case 3:
        return ["addressLine1", "city", "region", "idType", "idNumber"]
      case 4:
        return ["fee", "paymentMethod"]
      default:
        return []
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to issue cards",
        variant: "destructive",
      })
      return
    }

    // Validate age (must be at least 18 years old)
    const birthDate = new Date(values.dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 18) {
      toast({
        title: "Age Validation Error",
        description: "Customer must be at least 18 years old to get an E-Zwich card",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          user_id: user.id,
          branch_id: user.branchId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [E-ZWICH] API Error:", errorText)
        throw new Error(`Card issuance failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Card Issued Successfully",
          description: `E-Zwich card ${values.cardNumber} issued to ${values.customerName}`,
        })
        form.reset()
        setCurrentStep(1)
        setCustomerPhotoPreview("")
        setIdPhotoPreview("")
        if (onSuccess) {
          onSuccess(result.issuance)
        }
      } else {
        throw new Error(result.error || "Failed to issue card")
      }
    } catch (error: any) {
      console.error("❌ [E-ZWICH] Card issuance error:", error)
      toast({
        title: "Error",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate minimum date (18 years ago)
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() - 18)
  const maxDateString = maxDate.toISOString().split("T")[0]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <CreditCard className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-semibold">Card Information</h3>
              <p className="text-sm text-muted-foreground">Enter the E-Zwich card details</p>
            </div>

            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-Zwich Card Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter card number (max 10 digits)"
                      {...field}
                      maxLength={10}
                      className="font-mono text-lg text-center"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>Enter the E-Zwich card number (10 digits or less, numbers only)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partnerBank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner Bank *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingBanks}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select E-Zwich partner bank"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partnerBanks.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No E-Zwich partner banks found
                        </SelectItem>
                      ) : (
                        partnerBanks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.provider}>
                            {bank.provider} (Balance: GHS {Number(bank.current_balance).toFixed(2)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the partner bank for this E-Zwich card</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <p className="text-sm text-muted-foreground">Enter customer personal details</p>
            </div>

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +233 24 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="customer@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input type="date" max={maxDateString} {...field} />
                    </FormControl>
                    <FormDescription>Customer must be at least 18 years old</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 mx-auto text-purple-600 mb-2" />
              <h3 className="text-lg font-semibold">Address & Identification</h3>
              <p className="text-sm text-muted-foreground">Enter address and ID information</p>
            </div>

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ghanaRegions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="idType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ID type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ghana_card">Ghana Card</SelectItem>
                        <SelectItem value="voters_id">Voter's ID</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Camera className="h-12 w-12 mx-auto text-orange-600 mb-2" />
              <h3 className="text-lg font-semibold">Photos & Payment</h3>
              <p className="text-sm text-muted-foreground">Upload photos and set payment details</p>
            </div>

            {/* Customer Photo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Photo *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {customerPhotoPreview ? (
                  <div className="text-center">
                    <img
                      src={customerPhotoPreview || "/placeholder.svg"}
                      alt="Customer"
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-2"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomerPhotoPreview("")
                        form.setValue("customerPhoto", "")
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload customer photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file, "customer")
                      }}
                      className="hidden"
                      id="customer-photo"
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor="customer-photo" className="cursor-pointer">
                        Choose Photo
                      </label>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* ID Photo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ID Document Photo *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {idPhotoPreview ? (
                  <div className="text-center">
                    <img
                      src={idPhotoPreview || "/placeholder.svg"}
                      alt="ID Document"
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-2"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIdPhotoPreview("")
                        form.setValue("idPhoto", "")
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload ID document photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file, "id")
                      }}
                      className="hidden"
                      id="id-photo"
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor="id-photo" className="cursor-pointer">
                        Choose Photo
                      </label>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Issuance Fee (GHS) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    {feeConfig && (
                      <FormDescription>
                        {feeConfig.fee_type === "fixed" ? "Fixed fee" : "Variable fee"} from system configuration
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash Payment</SelectItem>
                        <SelectItem value="momo">Mobile Money</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          E-Zwich Card Issuance
        </CardTitle>
        <CardDescription>Issue a new E-Zwich card to a customer</CardDescription>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i + 1 <= currentStep ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-12 h-1 mx-2 ${i + 1 < currentStep ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-2">
          <Badge variant="outline">
            Step {currentStep} of {totalSteps}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep} className="flex items-center gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Issue Card
                    </>
                  )}
                </Button>
              )}
            </div>

            {onCancel && (
              <div className="text-center pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
