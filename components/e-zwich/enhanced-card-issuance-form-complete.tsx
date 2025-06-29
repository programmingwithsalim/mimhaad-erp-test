"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CreditCard, Upload, User, FileText } from "lucide-react"
import { differenceInYears, parseISO } from "date-fns"

// Enhanced validation schema
const formSchema = z
  .object({
    card_number: z
      .string()
      .length(10, "E-Zwich card number must be exactly 10 digits")
      .regex(/^\d{10}$/, "E-Zwich card number must contain only 10 digits"),
    customer_name: z.string().min(3, "Customer name must be at least 3 characters"),
    phone_number: z.string().min(10, "Phone number must be at least 10 characters"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    date_of_birth: z.string().refine((date) => {
      const birthDate = parseISO(date)
      const age = differenceInYears(new Date(), birthDate)
      return age >= 18
    }, "Customer must be at least 18 years old"),
    gender: z.enum(["male", "female", "other"], {
      required_error: "Please select a gender",
    }),
    address_line1: z.string().min(5, "Address must be at least 5 characters"),
    address_line2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    region: z.string().min(2, "Region is required"),
    postal_code: z.string().optional(),
    id_type: z.enum(["ghana_card", "voters_id", "passport", "drivers_license"], {
      required_error: "Please select an ID type",
    }),
    id_number: z.string().min(1, "ID number is required"),
    id_expiry_date: z.string().min(1, "ID expiry date is required"),
    fee_charged: z.coerce.number().min(0, "Fee cannot be negative").default(15),
    payment_method: z.enum(["cash", "momo", "bank_transfer"], {
      required_error: "Please select a payment method",
    }),
    customer_photo: z.string().optional(),
    id_document: z.string().optional(),
    reference: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate ID number based on type
      switch (data.id_type) {
        case "ghana_card":
          return /^GHA-\d{9}-\d$/.test(data.id_number)
        case "voters_id":
          return /^\d+$/.test(data.id_number)
        case "drivers_license":
          return /^[A-Z]{3}-\d{8}-\d{5}$/.test(data.id_number)
        case "passport":
          return /^\d{8}$/.test(data.id_number)
        default:
          return true
      }
    },
    {
      message: "Invalid ID number format for selected ID type",
      path: ["id_number"],
    },
  )

type FormValues = z.infer<typeof formSchema>

interface EnhancedCardIssuanceFormProps {
  onSuccess?: (data: any) => void
}

export function EnhancedCardIssuanceFormComplete({ onSuccess }: EnhancedCardIssuanceFormProps) {
  const { toast } = useToast()
  const { user } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      card_number: "",
      customer_name: "",
      phone_number: "",
      email: "",
      date_of_birth: "",
      gender: "male",
      address_line1: "",
      address_line2: "",
      city: "",
      region: "",
      postal_code: "",
      id_type: "ghana_card",
      id_number: "",
      id_expiry_date: "",
      fee_charged: 15,
      payment_method: "cash",
      customer_photo: "",
      id_document: "",
      reference: "",
    },
  })

  const watchIdType = form.watch("id_type")

  // Get ID format helper text
  const getIdFormatHelper = (idType: string) => {
    switch (idType) {
      case "ghana_card":
        return "Format: GHA-000000000-0 (e.g., GHA-123456789-1)"
      case "voters_id":
        return "Numeric only (e.g., 1234567890)"
      case "drivers_license":
        return "Format: ABC-00000000-00000 (First 3 letters + DOB + 5 digits)"
      case "passport":
        return "8 digits only (e.g., 12345678)"
      default:
        return ""
    }
  }

  // Handle file upload for photos/documents
  const handleFileUpload = async (file: File, fieldName: string) => {
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        form.setValue(fieldName as any, base64)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      })
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

      // Prepare the request data
      const requestData = {
        card_number: values.card_number,
        partner_bank: "E-Zwich Ghana", // Default partner bank
        customer_name: values.customer_name,
        customer_phone: values.phone_number,
        customer_email: values.email || null,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        region: values.region,
        postal_code: values.postal_code || null,
        id_type: values.id_type,
        id_number: values.id_number,
        id_expiry_date: values.id_expiry_date,
        fee_charged: values.fee_charged,
        payment_method: values.payment_method,
        customer_photo: values.customer_photo || null,
        id_document: values.id_document || null,
        reference: values.reference || `EZCARD-${Date.now()}`,
        user_id: user.id,
        branch_id: user.branchId,
        issued_by: user.id,
      }

      console.log("🔷 [CARD-ISSUANCE] Submitting request:", requestData)

      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-name": user.username || user.fullName || "Unknown User",
          "x-user-role": user.role || "user",
          "x-branch-id": user.branchId,
          "x-branch-name": user.branchName || "Unknown Branch",
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Card Issued Successfully",
          description: `E-Zwich card ${values.card_number} issued to ${values.customer_name}`,
        })
        form.reset()
        setReceiptData({ ...values, branchName: user.branchName })
        if (onSuccess) {
          onSuccess(result.cardIssuance)
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

  const printReceipt = () => {
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (!printWindow) return

    const receiptContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>E-Zwich Card Issuance Receipt</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.png" alt="MIMHAAD Logo" class="logo" />
          <h3>MIMHAAD FINANCIAL SERVICES</h3>
          <p>${receiptData?.branchName}</p>
          <p>Tel: 0241378880</p>
          <p>Email: info@mimhaadfinancial.com</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
        <div class="line"></div>
        <h4 style="text-align: center;">E-ZWICH CARD ISSUANCE RECEIPT</h4>
        <div class="line"></div>
        <div class="row"><span>Card Number:</span><span>${receiptData?.card_number}</span></div>
        <div class="row"><span>Customer:</span><span>${receiptData?.customer_name}</span></div>
        <div class="row"><span>Phone:</span><span>${receiptData?.phone_number}</span></div>
        <div class="row"><span>ID Type:</span><span>${receiptData?.id_type?.replace("_", " ").toUpperCase()}</span></div>
        <div class="row"><span>ID Number:</span><span>${receiptData?.id_number}</span></div>
        <div class="row"><span>Fee:</span><span>GHS ${receiptData?.fee_charged?.toFixed(2)}</span></div>
        <div class="row"><span>Payment Method:</span><span>${receiptData?.payment_method?.toUpperCase()}</span></div>
        <div class="row"><span>Status:</span><span>COMPLETED</span></div>
        <div class="line"></div>
        <div class="footer">
          <p>Thank you for using our service!</p>
          <p>For inquiries, please call our customer service at 0241378880</p>
          <p>Visit us at: www.mimhaadfinancial.com</p>
          <p>Powered by MIMHAAD Financial Services</p>
        </div>
      </body>
    </html>
  `

    printWindow.document.write(receiptContent)
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="h-6 w-6" />
          Issue E-Zwich Card (Enhanced)
        </CardTitle>
        <CardDescription>Complete card issuance form with full validation and documentation</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* CARD NUMBER FIELD */}
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
                        placeholder="Enter 10-digit card number (e.g., 1234567890)"
                        {...field}
                        maxLength={10}
                        className="text-lg font-mono tracking-wider h-12 border-2 border-blue-300 focus:border-blue-500"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-blue-700">
                      Enter the E-Zwich card number (exactly 10 digits, numbers only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CUSTOMER PERSONAL DETAILS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Personal Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
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
                        <Input placeholder="Enter customer phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Must be 18 years or older</FormDescription>
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

            {/* ADDRESS DETAILS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>

              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1 *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter primary address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter secondary address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <FormControl>
                        <Input placeholder="Enter region" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ID VERIFICATION */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                ID Verification
              </h3>

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
                        <Input placeholder="Enter ID number" {...field} />
                      </FormControl>
                      <FormDescription>{getIdFormatHelper(watchIdType)}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="id_expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Expiry Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Required for all ID types</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PAYMENT DETAILS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee_charged"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Fee (GHS) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
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
            </div>

            {/* DOCUMENT UPLOADS */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Uploads (Required)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer Photo *</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, "customer_photo")
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Upload customer's passport photo</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ID Document *</label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, "id_document")
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Upload copy of ID document</p>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter reference number or notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
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
      {receiptData && (
        <div className="p-4">
          <Button variant="outline" onClick={printReceipt}>
            Print Receipt
          </Button>
        </div>
      )}
    </Card>
  )
}
