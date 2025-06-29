"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

// This is a development-only hook to override the user's role for testing
export function useAuthOverride() {
  const { user, updateUser } = useAuth()

  useEffect(() => {
    // Only in development
    if (process.env.NODE_ENV !== "development") return

    // Check if we have a test role in localStorage
    const testRole = localStorage.getItem("test-role")
    if (!testRole || !user) return

    // Override the user's role for testing
    if (user.role !== testRole) {
      console.log(`[DEV] Overriding user role: ${user.role} -> ${testRole}`)
      updateUser({ ...user, role: testRole })
    }
  }, [user, updateUser])

  return null
}
