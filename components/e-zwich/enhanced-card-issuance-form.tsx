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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EzwichPartnerAccount {
  id: string;
  provider: string;
  account_number: string;
  account_type: string;
  current_balance?: string;
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
  address: z.string().optional(),
  city: z.string().min(2, "City is required"),
  region: z.string().min(2, "Region is required"),
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

const steps = ["Bio", "ID", "Card", "Review"];

export default function EnhancedCardIssuanceForm({
  allFloatAccounts = [],
  onSuccess,
}: EnhancedCardIssuanceFormProps) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedPartnerAccount, setSelectedPartnerAccount] =
    useState<EzwichPartnerAccount | null>(null);

  const methods = useForm({
    resolver: zodResolver(fullSchema),
    mode: "onTouched",
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      date_of_birth: "",
      gender: "",
      address: "",
      city: "",
      region: "",
      id_type: "",
      id_number: "",
      id_expiry_date: "",
      card_type: "standard",
      card_number: "",
      partner_bank: "",
      payment_method: undefined,
      customer_photo: null,
      id_front_image: null,
      id_back_image: null,
      notes: "",
      fee: "",
    },
  });

  const { handleSubmit, watch, setValue, trigger, formState } = methods;
  const values = watch();

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
        "address",
        "city",
        "region",
      ]);
    if (step === 1)
      valid = await trigger(["id_type", "id_number", "id_expiry_date"]);
    if (step === 2) {
      valid = await trigger([
        "card_type",
        "card_number",
        "partner_bank",
        "payment_method",
        "customer_photo",
        "id_front_image",
        "id_back_image",
      ]);
      if (!valid) {
        toast({
          title: "Missing or invalid fields",
          description:
            "Please fill all required card details and upload all images.",
          variant: "destructive",
        });
      }
    }
    if (step === 3) valid = true;
    if (valid && step < steps.length - 1)
      setStep((s) => Math.min(s + 1, steps.length - 1));
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
      const apiPaymentMethod =
        data.payment_method === "agency-banking"
          ? "bank"
          : data.payment_method === "cash-in-till"
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
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              <div className="space-y-4">
                {/* Bio fields */}
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
                    name="address"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter full address"
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
                      <FormItem className="md:col-span-2">
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter city" required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="region"
                    control={methods.control}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
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
            )}
            {step === 1 && (
              <div className="space-y-4">
                {/* ID fields */}
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
                              <SelectItem value="passport">Passport</SelectItem>
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
            )}
            {step === 2 && (
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
                        <FormLabel>Card Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter card number"
                            minLength={7}
                            maxLength={11}
                            required
                            pattern="^\d{7,11}$"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
                              <SelectItem value="cash-in-till">Cash</SelectItem>
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
                      let filteredAccounts = allFloatAccounts;
                      if (paymentMethod === "momo") {
                        filteredAccounts = allFloatAccounts.filter(
                          (a) => a.account_type === "momo"
                        );
                      } else if (paymentMethod === "agency-banking") {
                        filteredAccounts = allFloatAccounts.filter(
                          (a) => a.account_type === "agency-banking"
                        );
                      } else if (paymentMethod === "cash") {
                        filteredAccounts = allFloatAccounts.filter(
                          (a) => a.account_type === "cash"
                        );
                      }
                      // Find selected account
                      const selectedAccount =
                        filteredAccounts.find((a) => a.id === field.value) ||
                        null;
                      useEffect(() => {
                        setSelectedPartnerAccount(selectedAccount);
                      }, [field.value, filteredAccounts]);
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
                                {field.value ? "Change Photo" : "Upload Photo"}
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
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-xl font-bold mb-2">Review & Confirm</div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-lg p-4 shadow">
                    <div className="font-semibold text-primary mb-2">
                      Bio Information
                    </div>
                    <div>
                      <span className="font-medium">Full Name:</span>{" "}
                      {values.customer_name}
                    </div>
                    <div>
                      <span className="font-medium">Phone Number:</span>{" "}
                      {values.customer_phone}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {values.customer_email}
                    </div>
                    <div>
                      <span className="font-medium">Date of Birth:</span>{" "}
                      {values.date_of_birth}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span>{" "}
                      {values.gender}
                    </div>
                    <div>
                      <span className="font-medium">Address:</span>{" "}
                      {values.address}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {values.city}
                    </div>
                    <div>
                      <span className="font-medium">Region:</span>{" "}
                      {values.region}
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow">
                    <div className="font-semibold text-primary mb-2">
                      ID & Card Details
                    </div>
                    <div>
                      <span className="font-medium">ID Type:</span>{" "}
                      {values.id_type}
                    </div>
                    <div>
                      <span className="font-medium">ID Number:</span>{" "}
                      {values.id_number}
                    </div>
                    <div>
                      <span className="font-medium">ID Expiry Date:</span>{" "}
                      {values.id_expiry_date}
                    </div>
                    <div>
                      <span className="font-medium">Card Type:</span> Standard
                    </div>
                    <div>
                      <span className="font-medium">Card Number:</span>{" "}
                      {values.card_number}
                    </div>
                    <div>
                      <span className="font-medium">Payment Method:</span>{" "}
                      {values.payment_method}
                    </div>
                    <div>
                      <span className="font-medium">Fee:</span> {values.fee}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  {values.customer_photo && (
                    <div className="flex flex-col items-center">
                      <div className="font-semibold mb-1">Customer Photo</div>
                      <img
                        src={
                          values.customer_photo instanceof File
                            ? URL.createObjectURL(values.customer_photo)
                            : values.customer_photo
                        }
                        alt="Customer Photo"
                        className="w-32 h-32 object-cover rounded border shadow"
                      />
                    </div>
                  )}
                  {values.id_front_image && (
                    <div className="flex flex-col items-center">
                      <div className="font-semibold mb-1">ID Front Image</div>
                      <img
                        src={
                          values.id_front_image instanceof File
                            ? URL.createObjectURL(values.id_front_image)
                            : values.id_front_image
                        }
                        alt="ID Front"
                        className="w-32 h-32 object-cover rounded border shadow"
                      />
                    </div>
                  )}
                  {values.id_back_image && (
                    <div className="flex flex-col items-center">
                      <div className="font-semibold mb-1">ID Back Image</div>
                      <img
                        src={
                          values.id_back_image instanceof File
                            ? URL.createObjectURL(values.id_back_image)
                            : values.id_back_image
                        }
                        alt="ID Back"
                        className="w-32 h-32 object-cover rounded border shadow"
                      />
                    </div>
                  )}
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
