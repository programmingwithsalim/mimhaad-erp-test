"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Transaction {
  id: string;
  customer_name: string;
  phone_number: string;
  amount: number;
  fee: number;
  type: string;
  status: string;
  reference: string;
  provider: string;
  created_at: string;
  branch_id: string;
  branch_name?: string;
  processed_by: string;
  service_type: string;
}

interface TransactionFilters {
  search: string;
  service: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  branchId: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

// Cache for storing transaction data
const transactionCache = new Map<
  string,
  { data: Transaction[]; timestamp: number; pagination: PaginationInfo }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAllTransactions(autoRefresh = true, refreshInterval = 30000) {
  const { user } = useCurrentUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 50,
  });

  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    service: "",
    status: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    branchId: "",
  });

  // Debounce refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const filterTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoized values
  const canViewAllBranches = useMemo(
    () => user?.role === "admin" || user?.role === "finance",
    [user?.role]
  );

  const isFiltered = useMemo(
    () => !canViewAllBranches && !!user?.branchId,
    [canViewAllBranches, user?.branchId]
  );

  const effectiveFilters = useMemo(() => {
    const baseFilters = { ...filters };
    if (!canViewAllBranches && user?.branchId) {
      baseFilters.branchId = user.branchId;
    }
    return baseFilters;
  }, [filters, canViewAllBranches, user?.branchId]);

  // Generate cache key
  const getCacheKey = useCallback(
    (page: number, filters: TransactionFilters) => {
      return `${page}-${JSON.stringify(filters)}-${user?.branchId || "all"}`;
    },
    [user?.branchId]
  );

  // Check cache
  const getCachedData = useCallback((cacheKey: string) => {
    const cached = transactionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached;
    }
    return null;
  }, []);

  // Set cache
  const setCachedData = useCallback(
    (cacheKey: string, data: Transaction[], pagination: PaginationInfo) => {
      transactionCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        pagination,
      });
    },
    []
  );

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    for (const [key, value] of transactionCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        transactionCache.delete(key);
      }
    }
  }, []);

  const fetchTransactions = useCallback(
    async (page = 1, useCache = true) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const cacheKey = getCacheKey(page, effectiveFilters);

        // Check cache first
        if (useCache) {
          const cached = getCachedData(cacheKey);
          if (cached) {
            setTransactions(cached.data);
            setPagination(cached.pagination);
            setLoading(false);
            return;
          }
        }

        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
        });

        // Add filters to params
        Object.entries(effectiveFilters).forEach(([key, value]) => {
          if (value && value !== "all") {
            params.append(key, value);
          }
        });

        console.log("📊 Fetching transactions with params:", params.toString());

        const response = await fetch(
          `/api/transactions/all?${params.toString()}`,
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          const transactionData = data.data || [];
          const paginationData = data.pagination;

          setTransactions(transactionData);
          setPagination(paginationData);

          // Cache the result
          setCachedData(cacheKey, transactionData, paginationData);
        } else {
          throw new Error(data.error || "Failed to fetch transactions");
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      effectiveFilters,
      pagination.limit,
      getCacheKey,
      getCachedData,
      setCachedData,
    ]
  );

  // Debounced filter update
  const updateFilters = useCallback(
    (newFilters: Partial<TransactionFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));

      // Clear existing timeout
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }

      // Set new timeout for debounced fetch
      filterTimeoutRef.current = setTimeout(() => {
        fetchTransactions(1, false); // Don't use cache for filter changes
      }, 300);
    },
    [fetchTransactions]
  );

  // Debounced search update
  const updateSearch = useCallback(
    (search: string) => {
      setFilters((prev) => ({ ...prev, search }));

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced fetch
      searchTimeoutRef.current = setTimeout(() => {
        fetchTransactions(1, false); // Don't use cache for search changes
      }, 500); // Longer delay for search
    },
    [fetchTransactions]
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      service: "",
      status: "",
      type: "",
      dateFrom: "",
      dateTo: "",
      branchId: "",
    });
    fetchTransactions(1, false);
  }, [fetchTransactions]);

  const goToPage = useCallback(
    (page: number) => {
      fetchTransactions(page, true); // Use cache for pagination
    },
    [fetchTransactions]
  );

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  }, [pagination.hasNextPage, pagination.currentPage, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      goToPage(pagination.currentPage - 1);
    }
  }, [pagination.hasPrevPage, pagination.currentPage, goToPage]);

  // Clear cache and refetch
  const refetch = useCallback(() => {
    transactionCache.clear();
    fetchTransactions(pagination.currentPage, false);
  }, [fetchTransactions, pagination.currentPage]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTransactions(1, true);
    }
  }, [user, fetchTransactions]);

  // Clear expired cache periodically
  useEffect(() => {
    const interval = setInterval(clearExpiredCache, CACHE_DURATION);
    return () => clearInterval(interval);
  }, [clearExpiredCache]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing transactions...");
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch, user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  return {
    transactions,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    updateSearch,
    clearFilters,
    refetch,
    goToPage,
    nextPage,
    prevPage,
    canViewAllBranches,
    isFiltered,
    currentUserBranch: user?.branchId,
  };
}
