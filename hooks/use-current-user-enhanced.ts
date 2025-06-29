"use client"

import { useState, useEffect } from "react"

interface CurrentUser {
  id: string
  username: string
  email?: string
  role: string
  branchId?: string
  branchName?: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        } else {
          // Fallback for development/testing
          setUser({
            id: "dev-user-001",
            username: "Development User",
            email: "dev@example.com",
            role: "admin",
            branchId: "branch-001",
            branchName: "Main Branch",
          })
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
        // Fallback user for development
        setUser({
          id: "fallback-user",
          username: "System User",
          role: "admin",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  return { user, loading }
}
