"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCardBatches } from "@/hooks/use-e-zwich";
import { CreditCard, RefreshCw, Upload, User, Hash } from "lucide-react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface EzwichPartnerAccount {
  id: string;
  provider: string;
  account_number: string;
  account_type: string;
  current_balance?: string;
  is_active?: boolean;
  isezwichpartner: boolean;
}

interface EnhancedCardIssuanceFormProps {
  allFloatAccounts?: EzwichPartnerAccount[];
  onSuccess?: (data: any) => void;
}

const bioSchema = z.object({
  customer_name: z.string().min(2, "Full name is required"),
  customer_phone: z.string().min(8, "Phone number is required"),
  customer_email: z.string().email().optional().or(z.literal("")),
  date_of_birth: z.string().refine(
    (val) => {
      if (!val) return false;
      const dob = new Date(val);
      const today = new Date();
      const age =
        today.getFullYear() -
        dob.getFullYear() -
        (today.getMonth() < dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
          ? 1
          : 0);
      return age >= 18;
    },
    { message: "Customer must be at least 18 years old" }
  ),
  gender: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  region: z.string().min(2, "Region is required"),
  postal_code: z.string().optional(), // <-- Added to fix linter error
});
const idSchema = z.object({
  id_type: z.string().min(2, "ID type is required"),
  id_number: z.string().min(2, "ID number is required"),
  id_expiry_date: z.string().optional(),
});
const cardSchema = z.object({
  card_type: z.literal("standard"),
  card_number: z
    .string()
    .regex(/^\d{7,11}$/, "Card number must be 7 to 11 digits"),
  batch_id: z.string().min(1, "Card batch is required"),
  payment_method: z.enum(["momo", "agency-banking", "cash"], {
    message: "Payment method is required",
  }),
  partner_bank: z.string().min(2, "Partner bank is required"),
  fee: z.string().optional(),
});
const filesSchema = z.object({
  customer_photo: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "Customer photo is required",
    }),
  id_front_image: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "ID front image is required",
    }),
  id_back_image: z
    .any()
    .refine((file) => file instanceof File && file.size > 0, {
      message: "ID back image is required",
    }),
});
const notesSchema = z.object({
  notes: z.string().optional(),
});
const fullSchema = bioSchema
  .merge(idSchema)
  .merge(cardSchema)
  .merge(filesSchema)
  .merge(notesSchema)
  .refine(
    (data) => {
      const { id_type, id_number } = data;
      if (id_type === "ghana_card") {
        return /^GHA-\d{9}-\d$/.test(id_number);
      }
      if (id_type === "voters_id" || id_type === "nhis") {
        return /^\d{10}$/.test(id_number);
      }
      if (id_type === "passport") {
        return /^[A-Za-z][A-Za-z0-9]{7,}$/.test(id_number);
      }
      if (id_type === "drivers_license") {
        return /^[A-Za-z0-9]{5,}$/.test(id_number);
      }
      return false;
    },
    {
      message: "ID format is invalid for selected type",
      path: ["id_number"],
    }
  );

const steps = ["Bio & ID", "Card", "Review"];

type CardIssuanceFormData = z.infer<typeof fullSchema>;

export default function EnhancedCardIssuanceForm({
  allFloatAccounts = [],
  onSuccess,
}: EnhancedCardIssuanceFormProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { batches } = useCardBatches();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedPartnerAccount, setSelectedPartnerAccount] =
    useState<EzwichPartnerAccount | null>(null);

  // Filter available batches (those with cards remaining)
  const availableBatches =
    batches?.filter((batch) => batch.quantity_available > 0) || [];

  const methods = useForm<CardIssuanceFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      card_number: "",
      date_of_birth: "",
      gender: "",
      address_line1: "",
      address_line2: "",
      city: "",
      region: "",
      postal_code: "",
      id_type: "",
      id_number: "",
      batch_id: "",
      payment_method: "", // changed from undefined to ""
      partner_bank: "",
      fee: "15.00", // Default fee as string
      card_type: "standard",
      id_expiry_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 3 years from now
    },
  });

  const { handleSubmit, watch, setValue, trigger, formState, getValues } =
    methods;
  const values = watch();

  // Helper to collect all error messages
  const getAllErrorMessages = (errors: any, prefix = ""): string[] => {
    let messages: string[] = [];
    for (const key in errors) {
      if (errors[key]?.message) {
        messages.push(`${prefix}${errors[key].message}`);
      } else if (typeof errors[key] === "object") {
        messages = messages.concat(getAllErrorMessages(errors[key], `${key}.`));
      }
    }
    return messages;
  };

  // Scroll to top on error
  useEffect(() => {
    if (Object.keys(formState.errors).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [formState.errors]);

  useEffect(() => {
    fetch("/api/settings/fee-config/e-zwich?transactionType=card_issuance")
      .then((res) => res.json())
      .then((data) => {
        if (data?.config?.fee_value !== undefined) {
          setValue("fee", data.config.fee_value.toString());
        }
      });
  }, [setValue]);

  const nextStep = async () => {
    let valid = false;
    if (step === 0)
      valid = await trigger([
        "customer_name",
        "customer_phone",
        "customer_email",
        "date_of_birth",
        "gender",
        "address_line1",
        "city",
        "region",
        "id_type",
        "id_number",
        "id_expiry_date",
      ]);
    else if (step === 1)
      valid = await trigger([
        "card_type",
        "card_number",
        "batch_id",
        "payment_method",
        "partner_bank",
        "fee",
        "customer_photo",
        "id_front_image",
        "id_back_image",
      ]);
    else if (step === 2) {
      // Review step - validate everything
      valid = await trigger();
    }

    if (valid) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
    // Do NOT submit here; only advance step
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (data: any) => {
    console.log("Ezwich form submitted", data); // DEBUG
    if (!user?.branchId || !user?.id) {
      toast({
        title: "Error",
        description: "Branch ID is required",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const submitData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && typeof value === "string") {
          submitData.append(key, value);
        }
      });
      if (data.customer_photo)
        submitData.append("customer_photo", data.customer_photo);
      if (data.id_front_image)
        submitData.append("id_front_image", data.id_front_image);
      if (data.id_back_image)
        submitData.append("id_back_image", data.id_back_image);
      submitData.append("user_id", user.id);
      submitData.append("branch_id", user.branchId);
      submitData.append("processed_by", user.id);

      // Add partner account ID if selected
      if (data.partner_bank && selectedPartnerAccount) {
        submitData.append("partner_account_id", selectedPartnerAccount.id);
        submitData.append("partner_bank", selectedPartnerAccount.provider);
      }

      // Ensure fee is included
      const fee = data.fee || "15.00";
      submitData.append("fee", fee);

      const apiPaymentMethod =
        data.payment_method === "agency-banking"
          ? "bank"
          : data.payment_method === "cash"
          ? "cash"
          : data.payment_method;
      submitData.append("payment_method", apiPaymentMethod);

      const response = await fetch("/api/e-zwich/card-issuance", {
        method: "POST",
        body: submitData,
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Card Issuance Successful",
          description: "E-Zwich card has been issued successfully",
        });
        if (onSuccess) {
          onSuccess({
            id: result.cardId || `card-${Date.now()}`,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            card_type: data.card_type,
            type: "card_issuance",
          });
        }
        // Reset form and go back to first step
        methods.reset();
        setStep(0);
      } else {
        toast({
          title: "Card Issuance Failed",
          description: result.error || "Failed to issue card",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error issuing card:", error);
      toast({
        title: "Card Issuance Failed",
        description: "Failed to issue card",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setSelectedPartnerAccount(null);
  }, []);

  // Helper function to generate a card number
  const generateCardNumber = () => {
    const prefix = "639";
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0");
    const cardNumber = prefix + randomDigits;
    methods.setValue("card_number", cardNumber);
  };

  // Helper function to auto-fill region based on city
  const handleCityChange = (city: string) => {
    const cityRegionMap: Record<string, string> = {
      Accra: "Greater Accra",
      Kumasi: "Ashanti",
      Tamale: "Northern",
      Sekondi: "Western",
      "Cape Coast": "Central",
      Ho: "Volta",
      Sunyani: "Bono",
      Koforidua: "Eastern",
      Wa: "Upper West",
      Bolgatanga: "Upper East",
    };

    if (cityRegionMap[city]) {
      methods.setValue("region", cityRegionMap[city]);
    }
  };

  // Filter float accounts for E-Zwich payment method
  const filteredAccounts = allFloatAccounts.filter(
    (account: EzwichPartnerAccount) => {
      // First check if account is active
      if (account.is_active === false) return false;

      // Get the current payment method
      const paymentMethod = methods.watch("payment_method");

      // If no payment method selected, show all active accounts
      if (!paymentMethod) return true;

      // Filter based on payment method
      switch (paymentMethod) {
        case "momo":
          // Show only MoMo accounts
          return (
            account.account_type === "momo" ||
            account.provider.toLowerCase().includes("momo") ||
            account.provider.toLowerCase().includes("mtn") ||
            account.provider.toLowerCase().includes("vodafone") ||
            account.provider.toLowerCase().includes("airtel")
          );

        case "agency-banking":
          // Show only agency banking accounts
          return (
            account.account_type === "agency-banking" ||
            account.provider.toLowerCase().includes("bank") ||
            account.provider.toLowerCase().includes("agency")
          );

        case "cash":
          // Show only cash accounts
          return (
            account.account_type === "cash" ||
            account.provider.toLowerCase().includes("cash")
          );

        default:
          return true;
      }
    }
  );

  // Reset partner account when payment method changes
  useEffect(() => {
    const paymentMethod = methods.watch("payment_method");
    if (paymentMethod) {
      // Clear the partner bank selection when payment method changes
      methods.setValue("partner_bank", "");
      setSelectedPartnerAccount(null);
    }
  }, [methods.watch("payment_method")]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          E-Zwich Card Issuance
        </CardTitle>
        <CardDescription>
          Issue a new E-Zwich card with complete customer information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Error summary alert at the top */}
        {Object.keys(formState.errors).length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>There are errors in your submission:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {getAllErrorMessages(formState.errors).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            autoComplete="off"
          >
            <div className="flex justify-between mb-4">
              {steps.map((label, idx) => (
                <div
                  key={label}
                  className={`flex-1 text-center ${
                    step === idx
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
            {step === 0 && (
              <div className="space-y-6">
                {/* Bio fields */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                    <User className="h-5 w-5" />
                    Bio Information
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      name="customer_name"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter full name"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="customer_phone"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter phone number"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="customer_email"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter email address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="date_of_birth"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      name="gender"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="address_line1"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter address line 1"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="address_line2"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address Line 2</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter address line 2"
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="city"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleCityChange(value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Accra">Accra</SelectItem>
                                <SelectItem value="Kumasi">Kumasi</SelectItem>
                                <SelectItem value="Tamale">Tamale</SelectItem>
                                <SelectItem value="Sekondi">Sekondi</SelectItem>
                                <SelectItem value="Cape Coast">
                                  Cape Coast
                                </SelectItem>
                                <SelectItem value="Ho">Ho</SelectItem>
                                <SelectItem value="Sunyani">Sunyani</SelectItem>
                                <SelectItem value="Koforidua">
                                  Koforidua
                                </SelectItem>
                                <SelectItem value="Wa">Wa</SelectItem>
                                <SelectItem value="Bolgatanga">
                                  Bolgatanga
                                </SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="region"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter region"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* ID fields */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                    <Hash className="h-5 w-5" />
                    ID Information
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Controller
                      name="id_type"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Type *</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select ID type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ghana_card">
                                  Ghana Card
                                </SelectItem>
                                <SelectItem value="voters_id">
                                  Voter's ID
                                </SelectItem>
                                <SelectItem value="passport">
                                  Passport
                                </SelectItem>
                                <SelectItem value="drivers_license">
                                  Driver's License
                                </SelectItem>
                                <SelectItem value="nhis">NHIS Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="id_number"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Number *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter ID number"
                              required
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="id_expiry_date"
                      control={methods.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Expiry Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                {/* Card details fields */}
                <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  <CreditCard className="h-5 w-5" />
                  Card Details
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="card_number"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="Enter card number" />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateCardNumber}
                              className="whitespace-nowrap"
                            >
                              Generate
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    name="batch_id"
                    control={methods.control}
                    render={({ field }) => {
                      const selectedBatchData = availableBatches.find(
                        (batch) => batch.id === field.value
                      );

                      return (
                        <FormItem>
                          <FormLabel>Card Batch *</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose an available batch" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableBatches.map((batch) => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">
                                          {batch.batch_code}
                                        </span>
                                        <Badge variant="secondary">
                                          {batch.quantity_available} available
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {batch.partner_bank_name &&
                                          `Bank: ${batch.partner_bank_name} • `}
                                        Type: {batch.card_type} • Received:{" "}
                                        {batch.quantity_received} • Issued:{" "}
                                        {batch.quantity_issued}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {selectedBatchData && (
                            <div className="p-3 bg-muted rounded-lg mt-2">
                              <div className="text-sm font-medium mb-2">
                                Selected Batch Details:
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">
                                    Batch Code:
                                  </span>{" "}
                                  {selectedBatchData.batch_code}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Available:
                                  </span>{" "}
                                  {selectedBatchData.quantity_available} cards
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Card Type:
                                  </span>{" "}
                                  {selectedBatchData.card_type}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Partner Bank:
                                  </span>{" "}
                                  {selectedBatchData.partner_bank_name || "N/A"}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Total Received:
                                  </span>{" "}
                                  {selectedBatchData.quantity_received}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Already Issued:
                                  </span>{" "}
                                  {selectedBatchData.quantity_issued}
                                </div>
                              </div>
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <span className="font-medium text-blue-800">
                                  ⚠️ This batch will be deducted by 1 card when
                                  you issue.
                                </span>
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <Controller
                    name="payment_method"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setValue("partner_bank", "");
                            }}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="momo">MoMo</SelectItem>
                              <SelectItem value="agency-banking">
                                Bank
                              </SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    name="partner_bank"
                    control={methods.control}
                    render={({ field }) => {
                      const paymentMethod = methods.watch("payment_method");
                      // Find selected account
                      const selectedAccount =
                        filteredAccounts.find((a) => a.id === field.value) ||
                        null;

                      // Update selected partner account when field value changes
                      useEffect(() => {
                        setSelectedPartnerAccount(selectedAccount);
                      }, [field.value, selectedAccount]);

                      return (
                        <FormItem>
                          <FormLabel>Partner Account</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              required
                              disabled={!paymentMethod}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    paymentMethod
                                      ? "Select partner account"
                                      : "Select payment method first"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredAccounts.map(
                                  (account: EzwichPartnerAccount) => (
                                    <SelectItem
                                      key={account.id}
                                      value={account.id}
                                    >
                                      {account.provider} -{" "}
                                      {account.account_number}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {/* Dynamic balance display */}
                          {selectedPartnerAccount && (
                            <Alert className="mt-2 border-blue-200 bg-blue-50">
                              <AlertDescription>
                                <span className="font-medium">Balance:</span>{" "}
                                GHS{" "}
                                {Number(
                                  selectedPartnerAccount.current_balance || 0
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </AlertDescription>
                            </Alert>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    name="fee"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee (GHS)</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Controller
                    name="customer_photo"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Photo</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center hover:border-primary transition cursor-pointer bg-muted/30">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="customer_photo_input"
                              onChange={(e) =>
                                field.onChange(e.target.files?.[0] || null)
                              }
                            />
                            <label
                              htmlFor="customer_photo_input"
                              className="cursor-pointer flex flex-col items-center"
                            >
                              {field.value ? (
                                <img
                                  src={
                                    field.value instanceof File
                                      ? URL.createObjectURL(field.value)
                                      : field.value
                                  }
                                  alt="Preview"
                                  className="w-24 h-24 object-cover rounded mb-2 border"
                                />
                              ) : (
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {field.value ? "Change Photo" : "Upload Photo"}
                              </span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    name="id_front_image"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Front Image</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center hover:border-primary transition cursor-pointer bg-muted/30">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="id_front_image_input"
                              onChange={(e) =>
                                field.onChange(e.target.files?.[0] || null)
                              }
                            />
                            <label
                              htmlFor="id_front_image_input"
                              className="cursor-pointer flex flex-col items-center"
                            >
                              {field.value ? (
                                <img
                                  src={
                                    field.value instanceof File
                                      ? URL.createObjectURL(field.value)
                                      : field.value
                                  }
                                  alt="Preview"
                                  className="w-24 h-24 object-cover rounded mb-2 border"
                                />
                              ) : (
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {field.value ? "Change Image" : "Upload Front"}
                              </span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    name="id_back_image"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Back Image</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center hover:border-primary transition cursor-pointer bg-muted/30">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="id_back_image_input"
                              onChange={(e) =>
                                field.onChange(e.target.files?.[0] || null)
                              }
                            />
                            <label
                              htmlFor="id_back_image_input"
                              className="cursor-pointer flex flex-col items-center"
                            >
                              {field.value ? (
                                <img
                                  src={
                                    field.value instanceof File
                                      ? URL.createObjectURL(field.value)
                                      : field.value
                                  }
                                  alt="Preview"
                                  className="w-24 h-24 object-cover rounded mb-2 border"
                                />
                              ) : (
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {field.value ? "Change Image" : "Upload Back"}
                              </span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                {/* Review step */}
                <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                  <RefreshCw className="h-5 w-5" />
                  Review Information
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Bio Information Review */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Bio Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {values.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {values.customer_phone}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {values.customer_email || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Date of Birth:</span>{" "}
                        {values.date_of_birth || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Gender:</span>{" "}
                        {values.gender || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">City:</span> {values.city}
                      </div>
                      <div>
                        <span className="font-medium">Region:</span>{" "}
                        {values.region}
                      </div>
                    </div>
                  </div>

                  {/* ID Information Review */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">ID Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">ID Type:</span>{" "}
                        {values.id_type}
                      </div>
                      <div>
                        <span className="font-medium">ID Number:</span>{" "}
                        {values.id_number}
                      </div>
                      <div>
                        <span className="font-medium">Expiry Date:</span>{" "}
                        {values.id_expiry_date || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Card Information Review */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Card Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Card Number:</span>{" "}
                        {values.card_number}
                      </div>
                      <div>
                        <span className="font-medium">Card Batch:</span>{" "}
                        {(() => {
                          const selectedBatch = availableBatches.find(
                            (batch) => batch.id === values.batch_id
                          );
                          return selectedBatch
                            ? `${selectedBatch.batch_code} (${selectedBatch.quantity_available} available)`
                            : "Not selected";
                        })()}
                      </div>
                      <div>
                        <span className="font-medium">Payment Method:</span>{" "}
                        {values.payment_method}
                      </div>
                      <div>
                        <span className="font-medium">Partner Account:</span>{" "}
                        {selectedPartnerAccount?.provider || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Fee:</span> GHS{" "}
                        {values.fee}
                      </div>
                    </div>
                  </div>

                  {/* Notes Review */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">
                      Additional Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Notes:</span>{" "}
                        {values.notes || "N/A"}
                      </div>
                      <div>
                        <span className="font-medium">Customer Photo:</span>{" "}
                        {values.customer_photo ? "Uploaded" : "Not uploaded"}
                      </div>
                      <div>
                        <span className="font-medium">ID Front:</span>{" "}
                        {values.id_front_image ? "Uploaded" : "Not uploaded"}
                      </div>
                      <div>
                        <span className="font-medium">ID Back:</span>{" "}
                        {values.id_back_image ? "Uploaded" : "Not uploaded"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button type="button" onClick={prevStep} disabled={step === 0}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Issuing..." : "Submit"}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
