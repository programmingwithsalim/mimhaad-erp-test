import type { Commission, CommissionFilters } from "./commission-types"
import { getCommissions } from "./commission-database-service"

/**
 * Filter commissions based on provided criteria
 */
export async function filterCommissions(
  filters: CommissionFilters,
  userBranchId?: string,
  canViewAllBranches?: boolean,
): Promise<Commission[]> {
  try {
    // Get all commissions with branch awareness
    const commissions = await getCommissions(filters, userBranchId, canViewAllBranches)

    // Additional client-side filtering if needed
    let filteredCommissions = commissions

    // Apply search filter if provided
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredCommissions = filteredCommissions.filter(
        (commission) =>
          commission.reference.toLowerCase().includes(searchTerm) ||
          commission.description?.toLowerCase().includes(searchTerm) ||
          commission.sourceName.toLowerCase().includes(searchTerm),
      )
    }

    // Apply amount range filters if provided
    if (filters.minAmount !== undefined) {
      filteredCommissions = filteredCommissions.filter((commission) => commission.amount >= filters.minAmount!)
    }

    if (filters.maxAmount !== undefined) {
      filteredCommissions = filteredCommissions.filter((commission) => commission.amount <= filters.maxAmount!)
    }

    return filteredCommissions
  } catch (error) {
    console.error("Error filtering commissions:", error)
    return []
  }
}
