"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user-fixed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CreditCard, Upload, CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subYears } from "date-fns"
import { cn } from "@/lib/utils"

// Enhanced validation schema
const formSchema = z.object({
  card_number: z
    .string()
    .length(10, "E-Zwich card number must be exactly 10 digits")
    .regex(/^\d{10}$/, "E-Zwich card number must contain only 10 digits"),
  customer_name: z.string().min(3, "Customer name must be at least 3 characters"),
  phone_number: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  date_of_birth: z
    .date({
      required_error: "Date of birth is required",
    })
    .refine((date) => {
      const eighteenYearsAgo = subYears(new Date(), 18)
      return date <= eighteenYearsAgo
    }, "Customer must be at least 18 years old"),
  fee: z.coerce.number().min(0, "Fee cannot be negative"),
  payment_method: z.enum(["cash", "momo", "bank_transfer"], {
    required_error: "Please select a payment method",
  }),
  id_type: z.enum(["ghana_card", "voters_id", "passport", "drivers_license"], {
    required_error: "Please select an ID type",
  }),
  id_number: z
    .string()
    .min(5, "ID number must be at least 5 characters")
    .refine((value, ctx) => {
      const idType = ctx.parent.id_type

      switch (idType) {
        case "ghana_card":
          // Ghana card format: GHA-000000000-0
          const ghanaCardRegex = /^GHA-\d{9}-\d$/
          return ghanaCardRegex.test(value) || "Ghana Card format: GHA-000000000-0"

        case "voters_id":
          // Voters ID: only numbers
          const votersIdRegex = /^\d+$/
          return votersIdRegex.test(value) || "Voters ID must contain only numbers"

        case "drivers_license":
          // Drivers license: first 3 of first name-dob without dashes-5 digits
          const driversLicenseRegex = /^[A-Z]{3}-\d{8}-\d{5}$/
          return driversLicenseRegex.test(value) || "Drivers License format: ABC-00000000-00000"

        case "passport":
          // Passport: 8 digits
          const passportRegex = /^\d{8}$/
          return passportRegex.test(value) || "Passport number must be exactly 8 digits"

        default:
          return true
      }
    }, "Invalid ID number format"),
  id_expiry_date: z
    .date({
      required_error: "ID expiry date is required",
    })
    .refine((date) => {
      return date > new Date()
    }, "ID must not be expired"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select gender",
  }),
  customer_photo: z.any().refine((file) => {
    return file && file.length > 0
  }, "Customer photo is required"),
  id_document: z.any().refine((file) => {
    return file && file.length > 0
  }, "ID document photo is required"),
  reference: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EnhancedCardIssuanceFormProps {
  onSuccess?: (data: any) => void
}

export function EnhancedCardIssuanceFormFixed({ onSuccess }: EnhancedCardIssuanceFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feeConfig, setFeeConfig] = useState<any>(null)
  const [loadingFee, setLoadingFee] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      card_number: "",
      customer_name: "",
      phone_number: "",
      email: "",
      fee: 0,
      payment_method: "cash",
      id_type: "ghana_card",
      id_number: "",
      gender: "male",
      reference: "",
    },
  })

  const watchIdType = form.watch("id_type")

  // Load fee configuration
  useEffect(() => {
    const loadFeeConfig = async () => {
      setLoadingFee(true)
      try {
        const response = await fetch("/api/settings/fee-config/e-zwich")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setFeeConfig(data.config)
            form.setValue("fee", Number(data.config.fee_value))
          } else {
            form.setValue("fee", 15)
          }
        } else {
          form.setValue("fee", 15)
        }
      } catch (error) {
        console.error("Error loading fee config:", error)
        form.setValue("fee", 15)
      } finally {
        setLoadingFee(false)
      }
    }

    loadFeeConfig()
  }, [form])

  const getIdNumberPlaceholder = (idType: string) => {
    switch (idType) {
      case "ghana_card":
        return "GHA-000000000-0"
      case "voters_id":
        return "1234567890"
      case "drivers_license":
        return "SAL-00000000-00000"
      case "passport":
        return "12345678"
      default:
        return "Enter ID number"
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

    try {
      setIsSubmitting(true)

      // Create FormData for file uploads
      const formData = new FormData()

      // Add all form fields
      formData.append("card_number", values.card_number)
      formData.append("customer_name", values.customer_name)
      formData.append("phone_number", values.phone_number)
      formData.append("email", values.email || "")
      formData.append("date_of_birth", values.date_of_birth.toISOString())
      formData.append("fee", values.fee.toString())
      formData.append("payment_method", values.payment_method)
      formData.append("id_type", values.id_type)
      formData.append("id_number", values.id_number)
      formData.append("id_expiry_date", values.id_expiry_date.toISOString())
      formData.append("gender", values.gender)
      formData.append("reference", values.reference || "")

      // Add user context
      formData.append("user_id", user.id)
      formData.append("branch_id", user.branchId)
      formData.append("processed_by", user.username || user.email)
      formData.append("branchName", user.branchName || "Unknown Branch")

      // Add files
      if (values.customer_photo && values.customer_photo[0]) {
        formData.append("customer_photo", values.customer_photo[0])
      }
      if (values.id_document && values.id_document[0]) {
        formData.append("id_document", values.id_document[0])
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

      if (result.success) {
        toast({
          title: "Card Issued Successfully",
          description: `E-Zwich card ${values.card_number} issued to ${values.customer_name}`,
        })
        form.reset()
        if (onSuccess) {
          onSuccess(result.transaction)
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to issue card",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error issuing card:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="h-6 w-6" />
          Issue E-Zwich Card
        </CardTitle>
        <CardDescription>Complete all required fields to issue a new E-Zwich card</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Card Number */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <FormField
                control={form.control}
                name="card_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-bold text-blue-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      E-Zwich Card Number (Required)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 10-digit card number"
                        {...field}
                        maxLength={10}
                        className="text-lg font-mono tracking-wider h-12 border-2 border-blue-300 focus:border-blue-500"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
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

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > subYears(new Date(), 18) || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Customer must be at least 18 years old</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ID Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_type"
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
                name="id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number *</FormLabel>
                    <FormControl>
                      <Input placeholder={getIdNumberPlaceholder(watchIdType)} {...field} />
                    </FormControl>
                    <FormDescription>
                      {watchIdType === "ghana_card" && "Format: GHA-000000000-0"}
                      {watchIdType === "voters_id" && "Numbers only"}
                      {watchIdType === "drivers_license" && "Format: ABC-00000000-00000"}
                      {watchIdType === "passport" && "8 digits only"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ID Expiry Date */}
            <FormField
              control={form.control}
              name="id_expiry_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>ID Expiry Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick expiry date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>ID must not be expired</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_photo"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Customer Photo *</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...field} />
                        <Upload className="h-4 w-4" />
                      </div>
                    </FormControl>
                    <FormDescription>Upload a clear photo of the customer</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_document"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>ID Document Photo *</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...field} />
                        <Upload className="h-4 w-4" />
                      </div>
                    </FormControl>
                    <FormDescription>Upload a clear photo of the ID document</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fee and Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Fee (GHS) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} disabled={loadingFee} />
                    </FormControl>
                    {feeConfig && (
                      <FormDescription>
                        {feeConfig.fee_type === "fixed" ? "Fixed fee" : "Minimum fee"} from system configuration
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
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

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter reference number or notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting || loadingFee}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Card Issuance...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Issue E-Zwich Card
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
