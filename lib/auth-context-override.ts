"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// This is a development-only hook to override the user's role for testing
export function useAuthOverride() {
  const { user, updateUser } = useAuth();

  useEffect(() => {
    // Only in development
    if (process.env.NODE_ENV !== "development") return;

    // Check if we have a test role in localStorage
    const testRole = localStorage.getItem("test-role");
    const testBranch = localStorage.getItem("test-branch");

    if (!user) return;

    let hasChanges = false;
    const updatedUser = { ...user };

    // Override the user's role for testing
    if (testRole && user.role !== testRole) {
      console.log(`[DEV] Overriding user role: ${user.role} -> ${testRole}`);
      updatedUser.role = testRole;
      hasChanges = true;
    }

    // Override the user's branch for testing
    if (testBranch && user.branchId !== testBranch) {
      console.log(
        `[DEV] Overriding user branch: ${user.branchId} -> ${testBranch}`
      );
      updatedUser.branchId = testBranch;

      // Set branch name based on branch ID
      const branchNames: Record<string, string> = {
        "branch-001": "Main Branch",
        "branch-002": "East Branch",
        "branch-003": "West Branch",
        "branch-004": "North Branch",
        "branch-005": "South Branch",
      };
      updatedUser.branchName = branchNames[testBranch] || "Unknown Branch";
      hasChanges = true;
    }

    if (hasChanges) {
      updateUser(updatedUser);
    }
  }, [user, updateUser]);

  return null;
}
