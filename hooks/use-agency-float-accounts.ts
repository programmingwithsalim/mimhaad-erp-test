"use client";

import { useState, useEffect } from "react";

export interface AgencyFloatAccount {
  id: string;
  branch_id: string;
  account_type: string;
  provider: string;
  provider_code?: string;
  account_number?: string;
  current_balance: number;
  min_threshold: number;
  max_threshold: number;
  is_active: boolean;
  service_type?: string;
  transferFee?: number;
  minFee?: number;
  maxFee?: number;
  created_at: string;
  updated_at: string;
}

export function useAgencyFloatAccounts() {
  const [accounts, setAccounts] = useState<AgencyFloatAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch only agency banking accounts (excluding MoMo)
      const response = await fetch(
        "/api/bank-accounts/filtered?type=agency-banking"
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch agency banking accounts: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Additional client-side filtering to ensure only agency banking accounts
      const filteredAccounts = (data.accounts || []).filter(
        (account: AgencyFloatAccount) => {
          const isMoMoProvider = [
            "mtn",
            "vodafone",
            "airteltigo",
            "telecel",
          ].includes(account.provider.toLowerCase());
          const isMoMoType = ["momo", "mobile-money"].includes(
            account.account_type.toLowerCase()
          );
          const hasMoMoInName =
            account.provider.toLowerCase().includes("momo") ||
            account.provider.toLowerCase().includes("mobile");

          // Only include if it's agency banking and NOT a MoMo account
          return (
            account.account_type === "agency-banking" &&
            !isMoMoProvider &&
            !isMoMoType &&
            !hasMoMoInName &&
            account.is_active
          );
        }
      );

      console.log(`Loaded ${filteredAccounts.length} agency banking accounts`);
      setAccounts(filteredAccounts);
    } catch (err) {
      console.error("Error fetching agency banking accounts:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const refresh = () => {
    fetchAccounts();
  };

  return {
    accounts,
    isLoading,
    error,
    refresh,
  };
}
