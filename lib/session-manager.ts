"use client"

import { useAuth } from "./auth-context"
import { useEffect, useRef } from "react"

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const SESSION_WARNING_TIME = 5 * 60 * 1000 // 5 minutes before expiry

export function useSessionManager() {
  const { user, refreshSession, logout } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout>()
  const warningShownRef = useRef(false)

  useEffect(() => {
    if (!user) return

    // Set up periodic session checks
    intervalRef.current = setInterval(async () => {
      try {
        await refreshSession()
        warningShownRef.current = false
      } catch (error) {
        console.error("Session refresh failed:", error)
        await logout()
      }
    }, SESSION_CHECK_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, refreshSession, logout])

  const extendSession = async () => {
    try {
      await refreshSession()
      warningShownRef.current = false
    } catch (error) {
      console.error("Session extension failed:", error)
      await logout()
    }
  }

  return { extendSession }
}
