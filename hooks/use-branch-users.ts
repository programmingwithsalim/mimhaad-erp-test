"use client"

import { useQuery } from "react-query"
import { listUsers } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

const useBranchUsers = () => {
  const { user } = useAuth()

  const query = useQuery("users", () => listUsers(), {
    enabled: !!user,
  })

  return {
    ...query,
    users: query.data || [],
  }
}

export default useBranchUsers
