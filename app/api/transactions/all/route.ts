import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getCurrentUser } from "@/lib/auth-utils"

const sql = neon(process.env.CONNECTION_STRING!)

interface TransactionFilters {
  search?: string
  service?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  branchId?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract query parameters
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const filters: TransactionFilters = {
      search: searchParams.get("search") || undefined,
      service: searchParams.get("service") || undefined,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      branchId: searchParams.get("branchId") || undefined,
    }

    // Determine branch filter based on user role - be more restrictive
    let branchFilter: string | null = null
    if (user.role === "admin" || user.role === "finance") {
      // Admin and finance can see all branches, but can filter by specific branch
      if (filters.branchId && filters.branchId !== "all") {
        branchFilter = filters.branchId
      }
    } else {
      // All other roles can only see their own branch
      branchFilter = user.branchId || null

      // If no branch ID is available, return empty results for security
      if (!branchFilter) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit,
          },
        })
      }
    }

    console.log("Branch filtering applied:", {
      userRole: user.role,
      userBranchId: user.branchId,
      requestedBranchId: filters.branchId,
      finalBranchFilter: branchFilter,
    })

    // Get all transactions with proper column checking
    const allTransactions = await getAllTransactions(filters, branchFilter, limit, offset)
    const totalCount = await getTotalTransactionCount(filters, branchFilter)

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: allTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit,
      },
      filters: {
        ...filters,
        branchFilter,
      },
    })
  } catch (error) {
    console.error("Error fetching all transactions:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 50,
        },
      },
      { status: 500 },
    )
  }
}

async function getAllTransactions(
  filters: TransactionFilters,
  branchFilter: string | null,
  limit: number,
  offset: number,
) {
  const transactions: any[] = []

  // Define services and their table configurations
  const services = [
    {
      name: "MoMo",
      table: "momo_transactions",
      serviceKey: "momo",
    },
    {
      name: "Agency Banking",
      table: "agency_banking_transactions",
      serviceKey: "agency-banking",
    },
    {
      name: "E-Zwich",
      table: "e_zwich_transactions",
      serviceKey: "e-zwich",
    },
    {
      name: "Power",
      table: "power_transactions",
      serviceKey: "power",
    },
    {
      name: "Jumia",
      table: "jumia_transactions",
      serviceKey: "jumia",
    },
  ]

  for (const service of services) {
    try {
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${service.table}
        )
      `

      if (!tableExists[0]?.exists) {
        console.log(`Table ${service.table} does not exist, skipping...`)
        continue
      }

      // Skip if filtering by service and this isn't the selected service
      if (filters.service && filters.service !== service.serviceKey) {
        continue
      }

      // Get table columns to build dynamic query
      const columns = await getTableColumns(service.table)
      console.log(`Columns for ${service.table}:`, columns)

      // Build dynamic SELECT clause based on available columns
      const selectClause = `
        id,
        ${columns.includes("customer_name") ? "customer_name" : "'Unknown' as customer_name"},
        ${columns.includes("phone_number") ? "phone_number" : "'' as phone_number"},
        ${columns.includes("amount") ? "amount" : "0 as amount"},
        ${columns.includes("fee") ? "fee" : "0 as fee"},
        ${columns.includes("type") ? "type" : "'Unknown' as type"},
        ${columns.includes("status") ? "status" : "'completed' as status"},
        ${columns.includes("reference") ? "reference" : "'' as reference"},
        ${
          columns.includes("provider")
            ? "provider"
            : columns.includes("partner_bank")
              ? "partner_bank as provider"
              : "'Unknown' as provider"
        },
        ${columns.includes("created_at") ? "created_at" : "NOW() as created_at"},
        ${columns.includes("branch_id") ? "branch_id" : "'' as branch_id"},
        ${columns.includes("processed_by") ? "processed_by" : "'' as processed_by"}
      `

      // Use sql.query for dynamic queries
      let query = `
        SELECT ${selectClause}
        FROM ${service.table}
      `

      const params: any[] = []
      const conditions: string[] = []

      // Branch filter
      if (branchFilter && columns.includes("branch_id")) {
        conditions.push(`branch_id = $${params.length + 1}`)
        params.push(branchFilter)
      }

      // Search filter - only add if columns exist
      if (filters.search) {
        const searchConditions: string[] = []
        if (columns.includes("customer_name")) {
          searchConditions.push(`customer_name ILIKE $${params.length + 1}`)
          params.push(`%${filters.search}%`)
        }
        if (columns.includes("phone_number")) {
          // Only add this condition if we already added the parameter for customer_name
          if (searchConditions.length > 0) {
            searchConditions.push(`phone_number ILIKE $${params.length}`)
          } else {
            searchConditions.push(`phone_number ILIKE $${params.length + 1}`)
            params.push(`%${filters.search}%`)
          }
        }
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(" OR ")})`)
        }
      }

      // Status filter
      if (filters.status && columns.includes("status")) {
        conditions.push(`status = $${params.length + 1}`)
        params.push(filters.status)
      }

      // Type filter
      if (filters.type && columns.includes("type")) {
        conditions.push(`type = $${params.length + 1}`)
        params.push(filters.type)
      }

      // Date range filter
      if (filters.dateFrom && columns.includes("created_at")) {
        conditions.push(`created_at >= $${params.length + 1}`)
        params.push(filters.dateFrom)
      }

      if (filters.dateTo && columns.includes("created_at")) {
        conditions.push(`created_at <= $${params.length + 1}`)
        params.push(`${filters.dateTo} 23:59:59`)
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      // Add ORDER BY and LIMIT
      query += ` ORDER BY ${columns.includes("created_at") ? "created_at" : "id"} DESC LIMIT 1000`

      console.log(`Executing query for ${service.table}:`, query, params)

      // Execute the query
      const result = await sql.query(query, params)

      // Handle different result structures
      let rows: any[] = []
      if (result && Array.isArray(result)) {
        rows = result
      } else if (result && result.rows && Array.isArray(result.rows)) {
        rows = result.rows
      } else if (result && result.length !== undefined) {
        rows = Array.from(result)
      }

      console.log(`Found ${rows.length} transactions in ${service.table}`)

      // Add service type and ensure numeric values
      const serviceTransactions = rows.map((tx: any) => ({
        ...tx,
        service_type: service.name,
        amount: Number(tx.amount || 0),
        fee: Number(tx.fee || 0),
        created_at: tx.created_at || new Date().toISOString(),
      }))

      transactions.push(...serviceTransactions)
    } catch (error) {
      console.error(`Error fetching transactions from ${service.table}:`, error)
      // Continue with other services even if one fails
    }
  }

  // Sort all transactions by created_at and apply pagination
  const sortedTransactions = transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit)

  console.log(`Returning ${sortedTransactions.length} transactions out of ${transactions.length} total`)

  return sortedTransactions
}

async function getTotalTransactionCount(filters: TransactionFilters, branchFilter: string | null): Promise<number> {
  let totalCount = 0

  const services = [
    { table: "momo_transactions", serviceKey: "momo" },
    { table: "agency_banking_transactions", serviceKey: "agency-banking" },
    { table: "e_zwich_transactions", serviceKey: "e-zwich" },
    { table: "power_transactions", serviceKey: "power" },
    { table: "jumia_transactions", serviceKey: "jumia" },
  ]

  for (const service of services) {
    try {
      // Skip if filtering by service and this isn't the selected service
      if (filters.service && filters.service !== service.serviceKey) {
        continue
      }

      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${service.table}
        )
      `

      if (!tableExists[0]?.exists) continue

      const columns = await getTableColumns(service.table)

      let query = `SELECT COUNT(*) as count FROM ${service.table}`
      const params: any[] = []
      const conditions: string[] = []

      // Branch filter
      if (branchFilter && columns.includes("branch_id")) {
        conditions.push(`branch_id = $${params.length + 1}`)
        params.push(branchFilter)
      }

      // Search filter - only add if columns exist
      if (filters.search) {
        const searchConditions: string[] = []
        if (columns.includes("customer_name")) {
          searchConditions.push(`customer_name ILIKE $${params.length + 1}`)
          params.push(`%${filters.search}%`)
        }
        if (columns.includes("phone_number")) {
          // Only add this condition if we already added the parameter for customer_name
          if (searchConditions.length > 0) {
            searchConditions.push(`phone_number ILIKE $${params.length}`)
          } else {
            searchConditions.push(`phone_number ILIKE $${params.length + 1}`)
            params.push(`%${filters.search}%`)
          }
        }
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(" OR ")})`)
        }
      }

      // Status filter
      if (filters.status && columns.includes("status")) {
        conditions.push(`status = $${params.length + 1}`)
        params.push(filters.status)
      }

      // Type filter
      if (filters.type && columns.includes("type")) {
        conditions.push(`type = $${params.length + 1}`)
        params.push(filters.type)
      }

      // Date range filter
      if (filters.dateFrom && columns.includes("created_at")) {
        conditions.push(`created_at >= $${params.length + 1}`)
        params.push(filters.dateFrom)
      }

      if (filters.dateTo && columns.includes("created_at")) {
        conditions.push(`created_at <= $${params.length + 1}`)
        params.push(`${filters.dateTo} 23:59:59`)
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      console.log(`Executing count query for ${service.table}:`, query, params)

      const result = await sql.query(query, params)

      // Handle different result structures safely
      let count = 0
      if (result && Array.isArray(result) && result.length > 0) {
        count = Number(result[0]?.count || 0)
      } else if (result && result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
        count = Number(result.rows[0]?.count || 0)
      } else if (result && result.length !== undefined && result.length > 0) {
        const firstRow = Array.from(result)[0] as any
        count = Number(firstRow?.count || 0)
      }

      console.log(`Count for ${service.table}:`, count)
      totalCount += count
    } catch (error) {
      console.error(`Error counting transactions from ${service.table}:`, error)
    }
  }

  return totalCount
}

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
    `
    return result.map((row: any) => row.column_name)
  } catch (error) {
    console.error(`Error checking columns for ${tableName}:`, error)
    return []
  }
}
