"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Upload, User, FileText, X } from "lucide-react";
import { differenceInYears, parseISO } from "date-fns";
import { useBranchFloatAccounts } from "@/hooks/use-branch-float-accounts";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";

// Enhanced validation schema with age validation
const cardIssuanceSchema = z
  .object({
    card_number: z
      .string()
      .length(10, "Card number must be exactly 10 digits")
      .regex(/^\d+$/, "Card number must contain only digits"),
    customer_name: z
      .string()
      .min(2, "Customer name must be at least 2 characters"),
    customer_phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^\d+$/, "Phone number must contain only digits"),
    customer_email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    date_of_birth: z.string().refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge =
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age;
      return actualAge >= 18;
    }, "Customer must be at least 18 years old"),
    gender: z.enum(["male", "female", "other"]),
    address_line1: z.string().min(5, "Address must be at least 5 characters"),
    address_line2: z.string().optional(),
    city: z.string().min(2, "City must be at least 2 characters"),
    region: z.string().min(2, "Region must be at least 2 characters"),
    postal_code: z.string().optional(),
    id_type: z.enum(["ghana_card", "voters_id", "passport", "drivers_license"]),
    id_number: z.string().min(5, "ID number must be at least 5 characters"),
    id_expiry_date: z.string().refine((date) => {
      const expiryDate = new Date(date);
      const today = new Date();
      return expiryDate > today;
    }, "ID expiry date must be in the future"),
    fee_charged: z.number().min(0, "Fee must be non-negative"),
    payment_method: z.enum(["cash", "momo", "bank_transfer"]),
    reference: z.string().optional(),
    customer_photo: z.any().optional(),
    id_document: z.any().optional(),
  })
  .refine(
    (data) => {
      // Validate ID number based on type
      switch (data.id_type) {
        case "ghana_card":
          return /^GHA-\d{9}-\d$/.test(data.id_number);
        case "voters_id":
          return /^\d+$/.test(data.id_number);
        case "drivers_license":
          return /^[A-Z]{3}-\d{8}-\d{5}$/.test(data.id_number);
        case "passport":
          return /^\d{8}$/.test(data.id_number);
        default:
          return true;
      }
    },
    {
      message: "Invalid ID number format for selected ID type",
      path: ["id_number"],
    }
  );

type FormValues = z.infer<typeof cardIssuanceSchema>;

interface EnhancedCardIssuanceFormProps {
  onSuccess?: (transaction: any) => void;
}

export function EnhancedCardIssuanceFormComplete({
  onSuccess,
}: EnhancedCardIssuanceFormProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [customerPhotoPreview, setCustomerPhotoPreview] = useState<string>("");
  const [idDocumentPreview, setIdDocumentPreview] = useState<string>("");

  const {
    accounts: floatAccounts,
    loading: loadingAccounts,
    refetch: refreshAccounts,
  } = useBranchFloatAccounts();

  // Filter E-Zwich partner accounts
  const ezwichAccounts = floatAccounts.filter(
    (account) => account.account_type === "e-zwich" && account.is_active
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(cardIssuanceSchema),
    defaultValues: {
      card_number: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
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
      fee_charged: 15.0,
      payment_method: "cash",
      reference: "",
    },
  });

  const watchPaymentMethod = form.watch("payment_method");
  const watchDateOfBirth = form.watch("date_of_birth");

  // Calculate age when date of birth changes
  useEffect(() => {
    if (watchDateOfBirth) {
      const birthDate = new Date(watchDateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge =
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age;

      if (actualAge < 18) {
        form.setError("date_of_birth", {
          type: "manual",
          message: `Customer must be at least 18 years old. Current age: ${actualAge}`,
        });
      } else {
        form.clearErrors("date_of_birth");
      }
    }
  }, [watchDateOfBirth, form]);

  // Handle file uploads
  const handleFileUpload = (
    field: "customer_photo" | "id_document",
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (field === "customer_photo") {
        setCustomerPhotoPreview(result);
      } else {
        setIdDocumentPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (field: "customer_photo" | "id_document") => {
    if (field === "customer_photo") {
      setCustomerPhotoPreview("");
      form.setValue("customer_photo", undefined);
    } else {
      setIdDocumentPreview("");
      form.setValue("id_document", undefined);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to issue cards",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare the request data
      const requestData = {
        card_number: values.card_number,
        partner_bank: "E-Zwich Ghana", // Default partner bank
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email || null,
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
      };

      console.log("🔷 [CARD-ISSUANCE] Submitting request:", requestData);

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
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Card Issued Successfully",
          description: `E-Zwich card ${values.card_number} issued to ${values.customer_name}`,
        });

        // Set receipt data for printing
        setReceiptData({
          transactionId: result.issuance?.id || `card-${Date.now()}`,
          sourceModule: "e-zwich",
          transactionType: "card_issuance",
          amount: values.fee_charged,
          fee: 0,
          customerName: values.customer_name,
          reference: values.reference,
          branchName: user.branchName || "Unknown Branch",
          date: new Date().toISOString(),
        });

        // Reset form
        form.reset();
        setCustomerPhotoPreview("");
        setIdDocumentPreview("");

        if (onSuccess) {
          onSuccess(result.issuance);
        }
      } else {
        throw new Error(result.error || "Failed to issue card");
      }
    } catch (error) {
      console.error("❌ [CARD-ISSUANCE] Error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to issue card",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!receiptData) return;

    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>E-Zwich Card Issuance Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 20px; max-width: 300px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
          .line { border-bottom: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #000; padding-top: 10px; }
          .title { font-size: 14px; font-weight: bold; text-align: center; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/logo.png" alt="MIMHAAD Logo" class="logo" />
          <h3>MIMHAAD FINANCIAL SERVICES</h3>
          <p>${receiptData.branchName}</p>
          <p>Tel: 0241378880</p>
          <p>${new Date(receiptData.date).toLocaleString()}</p>
        </div>
        
        <div class="title">E-ZWICH CARD ISSUANCE RECEIPT</div>
        
        <div class="line"></div>
        
        <div class="row">
          <span>Transaction ID:</span>
          <span>${receiptData.transactionId}</span>
        </div>
        
        <div class="row">
          <span>Customer:</span>
          <span>${receiptData.customerName}</span>
        </div>
        
        <div class="row">
          <span>Card Fee:</span>
          <span>GHS ${receiptData.amount.toFixed(2)}</span>
        </div>
        
        <div class="row">
          <span>Reference:</span>
          <span>${receiptData.reference}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="row" style="font-weight: bold; font-size: 14px;">
          <span>TOTAL:</span>
          <span>GHS ${receiptData.amount.toFixed(2)}</span>
        </div>
        
        <div class="footer">
          <p>Thank you for using our service!</p>
          <p>For inquiries, please call 0241378880</p>
          <p>Powered by MIMHAAD Financial Services</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) {
      console.error("Failed to open print window");
      return;
    }

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  // Calculate minimum date (18 years ago)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateString = maxDate.toISOString().split("T")[0];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="h-6 w-6" />
          Issue E-Zwich Card
        </CardTitle>
        <CardDescription>
          Complete all required fields to issue a new E-Zwich card
        </CardDescription>
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
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription className="text-blue-700">
                      Enter the E-Zwich card number (exactly 10 digits, numbers
                      only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CUSTOMER PERSONAL DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                <User className="h-5 w-5" />
                Personal Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0241234567"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="customer@example.com"
                          {...field}
                        />
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
                      <FormLabel>Date of Birth * (Must be 18+)</FormLabel>
                      <FormControl>
                        <Input type="date" max={maxDateString} {...field} />
                      </FormControl>
                      <FormDescription>
                        Customer must be at least 18 years old
                      </FormDescription>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

            {/* ADDRESS INFORMATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1 *</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
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
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Apartment, suite, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
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
                        <Input placeholder="Region" {...field} />
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
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* IDENTIFICATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                <FileText className="h-5 w-5" />
                Identification
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ghana_card">Ghana Card</SelectItem>
                          <SelectItem value="voters_id">Voter's ID</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="drivers_license">
                            Driver's License
                          </SelectItem>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Expiry Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={new Date().toISOString().split("T")[0]}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Must be a future date</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* DOCUMENT UPLOADS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                <Camera className="h-5 w-5" />
                Document Uploads
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Photo */}
                <div className="space-y-2">
                  <Label>Customer Photo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {customerPhotoPreview ? (
                      <div className="space-y-2">
                        <img
                          src={customerPhotoPreview}
                          alt="Customer photo preview"
                          className="w-32 h-32 object-cover mx-auto rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile("customer_photo")}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Photo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Upload customer photo
                        </p>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              form.setValue("customer_photo", file);
                              handleFileUpload("customer_photo", file);
                            }
                          }}
                          className="hidden"
                          id="customer-photo"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("customer-photo")?.click()
                          }
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Choose Photo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ID Document */}
                <div className="space-y-2">
                  <Label>ID Document</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {idDocumentPreview ? (
                      <div className="space-y-2">
                        <img
                          src={idDocumentPreview}
                          alt="ID document preview"
                          className="w-32 h-32 object-cover mx-auto rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile("id_document")}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Document
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Upload ID document
                        </p>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              form.setValue("id_document", file);
                              handleFileUpload("id_document", file);
                            }
                          }}
                          className="hidden"
                          id="id-document"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("id-document")?.click()
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Choose Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee_charged"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Fee (GHS) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="15.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash Payment</SelectItem>
                          <SelectItem value="momo">Mobile Money</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* E-Zwich Partner Account Selection */}
              {watchPaymentMethod && watchPaymentMethod !== "cash" && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    E-Zwich Partner Account
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Available E-Zwich partner accounts for settlement:
                  </p>
                  <div className="space-y-2">
                    {ezwichAccounts.length === 0 ? (
                      <p className="text-sm text-red-600">
                        No E-Zwich partner accounts available
                      </p>
                    ) : (
                      ezwichAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <span className="font-medium">
                            {account.provider}
                          </span>
                          <Badge variant="outline">
                            {formatCurrency(account.current_balance)}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* REFERENCE */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter reference number or notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isSubmitting}
            >
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
  );
}
