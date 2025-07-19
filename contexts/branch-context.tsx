"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";

// Define the Branch type
export interface Branch {
  id: string;
  name: string;
  code: string;
  location: string;
  region: string;
  manager: string;
  contactPhone?: string;
  email?: string;
  staffCount?: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Define the context type
interface BranchContextType {
  branches: Branch[];
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  selectedBranch: Branch | null;
  loading: boolean;
  error: string | null;
  refreshBranches: () => Promise<void>;
}

// Create the context with a default value
const BranchContext = createContext<BranchContextType>({
  branches: [],
  selectedBranchId: null,
  setSelectedBranchId: () => {},
  selectedBranch: null,
  loading: false,
  error: null,
  refreshBranches: async () => {},
});

// Create a provider component
export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute the selected branch
  const selectedBranch = selectedBranchId
    ? branches.find((b) => b.id === selectedBranchId) || null
    : null;

  // Fetch branches on component mount
  useEffect(() => {
    refreshBranches();
  }, []);

  // Function to refresh branches
  const refreshBranches = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching branches...");

      // For admin users, include inactive branches
      const response = await fetch("/api/branches?includeInactive=true");

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`);
      }

      const data = await response.json();

      console.log("Branches API response:", data);

      // Handle the API response format
      if (data.success && Array.isArray(data.data)) {
        console.log("Setting branches from data.data:", data.data);
        setBranches(data.data);
      } else if (Array.isArray(data)) {
        console.log("Setting branches from direct array:", data);
        setBranches(data);
      } else if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.branches)
      ) {
        console.log("Setting branches from data.branches:", data.branches);
        setBranches(data.branches);
      } else {
        console.error("Unexpected data format:", data);
        setBranches([]);
        setError("Received invalid data format from server");
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Create the context value
  const contextValue: BranchContextType = {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
    loading,
    error,
    refreshBranches,
  };

  return (
    <BranchContext.Provider value={contextValue}>
      {children}
    </BranchContext.Provider>
  );
}

// Create a custom hook to use the branch context
export function useBranch() {
  const context = useContext(BranchContext);

  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }

  return context;
}
