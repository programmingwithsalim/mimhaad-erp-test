"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "./use-current-user";

interface CashInTillAccount {
  id: string;
  account_name: string;
  current_balance: number;
  min_threshold: number;
  max_threshold: number;
  account_type: string;
  provider: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseCashInTillReturn {
  cashAccount: CashInTillAccount | null;
  isLoading: boolean;
  error: string | null;
  isLowBalance: boolean;
  balanceStatus: "healthy" | "warning" | "critical";
  refreshCashTill: () => Promise<void>;
  updateBalance: (amount: number, description?: string) => Promise<void>;
}

export function useCashInTillRobust(): UseCashInTillReturn {
  const [cashAccount, setCashAccount] = useState<CashInTillAccount | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useCurrentUser();

  const fetchCashInTill = useCallback(async () => {
    if (!user?.branchId) {
      setError("No branch ID available");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch cash in till from float accounts
      const response = await fetch(
        `/api/float-accounts?branchId=${user.branchId}&type=cash-in-till&isActive=true`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch cash in till: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.accounts && data.accounts.length > 0) {
        // Find cash in till account
        const cashTillAccount = data.accounts.find(
          (acc: any) =>
            acc.account_type === "cash-in-till" ||
            acc.provider?.toLowerCase().includes("cash") ||
            acc.account_name?.toLowerCase().includes("cash")
        );

        if (cashTillAccount) {
          setCashAccount({
            ...cashTillAccount,
            current_balance: Number(cashTillAccount.current_balance) || 0,
            min_threshold: Number(cashTillAccount.min_threshold) || 1000,
            max_threshold: Number(cashTillAccount.max_threshold) || 50000,
          });
        } else {
          // Create default if none found
          setCashAccount({
            id: `default-cash-${user.branchId}`,
            account_name: "Cash in Till",
            current_balance: 0,
            min_threshold: 1000,
            max_threshold: 50000,
            account_type: "cash-in-till",
            provider: "Cash",
            branch_id: user.branchId,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        // Create default cash till account
        setCashAccount({
          id: `default-cash-${user.branchId}`,
          account_name: "Cash in Till",
          current_balance: 0,
          min_threshold: 1000,
          max_threshold: 50000,
          account_type: "cash-in-till",
          provider: "Cash",
          branch_id: user.branchId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error fetching cash in till:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch cash in till"
      );

      // Provide fallback data
      if (user?.branchId) {
        setCashAccount({
          id: `fallback-cash-${user.branchId}`,
          account_name: "Cash in Till",
          current_balance: 0,
          min_threshold: 1000,
          max_threshold: 50000,
          account_type: "cash-in-till",
          provider: "Cash",
          branch_id: user.branchId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  const updateBalance = useCallback(
    async (amount: number, description?: string) => {
      if (!user?.branchId || !cashAccount) {
        throw new Error("No branch or cash account available");
      }

      try {
        const response = await fetch(
          `/api/float-accounts/${cashAccount.id}/update-balance`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount,
              description,
              userId: user.id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update balance: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.account) {
          setCashAccount(data.account);
        }
      } catch (err) {
        console.error("Error updating cash balance:", err);
        throw err;
      }
    },
    [user?.branchId, user?.id, cashAccount]
  );

  useEffect(() => {
    fetchCashInTill();
  }, [fetchCashInTill]);

  // Calculate balance status
  const isLowBalance = cashAccount
    ? cashAccount.current_balance < cashAccount.min_threshold
    : false;
  const balanceStatus: "healthy" | "warning" | "critical" = cashAccount
    ? cashAccount.current_balance < cashAccount.min_threshold * 0.5
      ? "critical"
      : cashAccount.current_balance < cashAccount.min_threshold
      ? "warning"
      : "healthy"
    : "critical";

  return {
    cashAccount,
    isLoading,
    error,
    isLowBalance,
    balanceStatus,
    refreshCashTill: fetchCashInTill,
    updateBalance,
  };
}
