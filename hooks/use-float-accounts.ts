"use client";

import { useState, useEffect } from "react";

export interface FloatAccount {
  id: string;
  branch_id: string;
  branch_name: string;
  account_type: string;
  provider?: string;
  current_balance: number;
  min_threshold: number;
  max_threshold: number;
  last_updated: string;
  created_at: string;
  status: string;
}

export function useFloatAccounts() {
  const [accounts, setAccounts] = useState<FloatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching float accounts...");

      const response = await fetch("/api/float-accounts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch float accounts: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Float accounts response:", result);

      // Handle different response formats
      let accountsData = [];
      if (result.success && result.data && Array.isArray(result.data)) {
        accountsData = result.data;
      } else if (result.accounts && Array.isArray(result.accounts)) {
        accountsData = result.accounts;
      } else if (Array.isArray(result)) {
        accountsData = result;
      } else {
        console.warn("Unexpected response format:", result);
        accountsData = [];
      }

      console.log(`Setting ${accountsData.length} float accounts`);
      setAccounts(accountsData);
    } catch (err) {
      console.error("Error fetching float accounts:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch float accounts")
      );
      // Do NOT setAccounts([]) here; leave accounts as-is to surface the error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const refetch = () => {
    fetchAccounts();
  };

  return {
    accounts,
    loading,
    error,
    refetch,
  };
}

export function useFloatAccountsByBranch(branchId: string) {
  const [accounts, setAccounts] = useState<FloatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "[useFloatAccountsByBranch] Fetching for branchId:",
        branchId
      );

      const response = await fetch(
        `/api/branches/${encodeURIComponent(branchId)}/float-accounts`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      console.log("##########################", response);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch float accounts: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("[useFloatAccountsByBranch] API response:", data);

      // Handle different response formats
      let accountsData = [];
      if (data.success && data.accounts && Array.isArray(data.accounts)) {
        accountsData = data.accounts;
      } else if (data.data && Array.isArray(data.data)) {
        accountsData = data.data;
      } else if (Array.isArray(data)) {
        accountsData = data;
      } else {
        console.warn("Unexpected response format:", data);
        accountsData = [];
      }

      console.log(
        `[useFloatAccountsByBranch] Setting ${accountsData.length} accounts`
      );
      setAccounts(accountsData);
    } catch (err) {
      console.error("Error fetching float accounts:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch float accounts")
      );
      setAccounts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchAccounts();
    }
  }, [branchId]);

  const refetch = () => {
    if (branchId) {
      fetchAccounts();
    }
  };

  return {
    accounts,
    loading,
    error,
    refetch,
  };
}
