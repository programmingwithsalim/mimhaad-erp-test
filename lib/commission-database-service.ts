import { neon } from "@neondatabase/serverless"
import type {
  Commission,
  CommissionInput,
  CommissionFilters,
  CommissionStatistics,
  CommissionStatus,
} from "./commission-types"

const sql = neon(process.env.DATABASE_URL!)

// Check if commission tables exist
async function checkTablesExist(): Promise<boolean> {
  try {
    await sql`SELECT 1 FROM commissions LIMIT 1`
    return true
  } catch (error) {
    return false
  }
}

// Check if branch columns exist
async function checkBranchColumnsExist(): Promise<boolean> {
  try {
    await sql`SELECT branch_id FROM commissions LIMIT 1`
    return true
  } catch (error) {
    return false
  }
}

// Check if reference already exists
async function checkReferenceExists(reference: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM commissions WHERE reference = ${reference} LIMIT 1
    `
    return result.length > 0
  } catch (error) {
    console.error("Error checking reference:", error)
    return false
  }
}

// Initialize commission tables if they don't exist
async function initializeTables(): Promise<void> {
  try {
    console.log("Initializing commission tables...")

    // Create commissions table with branch fields
    await sql`
      CREATE TABLE IF NOT EXISTS commissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source VARCHAR(50) NOT NULL,
          source_name VARCHAR(255) NOT NULL,
          amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
          month DATE NOT NULL,
          reference VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
          gl_account VARCHAR(20),
          gl_account_name VARCHAR(255),
          branch_id VARCHAR(255),
          branch_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by_id VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL,
          updated_by_id VARCHAR(255),
          updated_by_name VARCHAR(255)
      )
    `

    // Create commission payments table
    await sql`
      CREATE TABLE IF NOT EXISTS commission_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
          method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
          received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          bank_account VARCHAR(255),
          reference_number VARCHAR(255),
          notes TEXT,
          processed_by_id VARCHAR(255) NOT NULL,
          processed_by_name VARCHAR(255) NOT NULL,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create commission comments table
    await sql`
      CREATE TABLE IF NOT EXISTS commission_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_by_id VARCHAR(255) NOT NULL,
          created_by_name VARCHAR(255) NOT NULL
      )
    `

    // Create commission metadata table for additional fields
    await sql`
      CREATE TABLE IF NOT EXISTS commission_metadata (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
          transaction_volume INTEGER,
          commission_rate VARCHAR(20),
          settlement_period VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_source ON commissions(source)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_payments_commission_id ON commission_payments(commission_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_comments_commission_id ON commission_comments(commission_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_commission_metadata_commission_id ON commission_metadata(commission_id)`

    // Create updated_at trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_commissions_updated_at ON commissions
    `
    await sql`
      CREATE TRIGGER update_commissions_updated_at 
          BEFORE UPDATE ON commissions 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `

    console.log("Commission tables initialized successfully")
  } catch (error) {
    console.error("Error initializing commission tables:", error)
    throw error
  }
}

// Get all commissions with optional filters and branch awareness
export async function getCommissions(
  filters?: CommissionFilters,
  userBranchId?: string,
  canViewAllBranches?: boolean,
): Promise<Commission[]> {
  try {
    console.log("Starting getCommissions with filters:", filters)
    console.log("Branch filtering - userBranchId:", userBranchId, "canViewAllBranches:", canViewAllBranches)

    // Check if tables exist, initialize if not
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      console.log("Commission tables don't exist, initializing...")
      await initializeTables()
      return []
    }

    // Check if branch columns exist, add them if not
    const branchColumnsExist = await checkBranchColumnsExist()
    if (!branchColumnsExist) {
      console.log("Branch columns don't exist, adding them...")
      await sql`
        ALTER TABLE commissions 
        ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_commissions_branch_id ON commissions(branch_id)`
    }

    let baseQuery = `
      SELECT 
        c.*,
        cp.status as payment_status,
        cp.method as payment_method,
        cp.received_at as payment_received_at,
        cp.bank_account as payment_bank_account,
        cp.reference_number as payment_reference_number,
        cp.notes as payment_notes,
        cp.processed_by_id as payment_processed_by_id,
        cp.processed_by_name as payment_processed_by_name,
        cp.processed_at as payment_processed_at,
        cm.transaction_volume,
        cm.commission_rate,
        cm.settlement_period
      FROM commissions c
      LEFT JOIN commission_payments cp ON c.id = cp.commission_id
      LEFT JOIN commission_metadata cm ON c.id = cm.commission_id
    `

    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // IMPORTANT: Only admins can view all branches, everyone else sees only their branch
    if (!canViewAllBranches && userBranchId) {
      conditions.push(`(c.branch_id = $${paramIndex} OR c.branch_id IS NULL)`)
      params.push(userBranchId)
      paramIndex++
      console.log(`Filtering by branch: ${userBranchId}`)
    } else if (canViewAllBranches) {
      console.log("Admin user - showing all branches")
    }

    // Apply other filters
    if (filters) {
      if (filters.source && filters.source.length > 0 && !filters.source.includes("all")) {
        conditions.push(`c.source = ANY($${paramIndex})`)
        params.push(filters.source)
        paramIndex++
      }

      if (filters.status && filters.status.length > 0 && !filters.status.includes("all")) {
        conditions.push(`c.status = ANY($${paramIndex})`)
        params.push(filters.status)
        paramIndex++
      }

      if (filters.search) {
        conditions.push(
          `(c.reference ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex} OR c.source_name ILIKE $${paramIndex})`,
        )
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.startDate) {
        conditions.push(`c.month >= $${paramIndex}`)
        params.push(filters.startDate)
        paramIndex++
      }

      if (filters.endDate) {
        conditions.push(`c.month <= $${paramIndex}`)
        params.push(filters.endDate)
        paramIndex++
      }

      if (filters.branchId && canViewAllBranches) {
        conditions.push(`c.branch_id = $${paramIndex}`)
        params.push(filters.branchId)
        paramIndex++
      }
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(" AND ")}`
    }

    baseQuery += ` ORDER BY c.created_at DESC`

    console.log("Final query:", baseQuery)
    console.log("Query params:", params)

    const result = await sql.query(baseQuery, params)
    const rows = Array.isArray(result) ? result : result.rows || []

    console.log(`Query returned ${rows.length} commissions`)

    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      sourceName: row.source_name,
      amount: Number.parseFloat(row.amount),
      month: row.month,
      reference: row.reference,
      description: row.description,
      status: row.status as CommissionStatus,
      glAccount: row.gl_account,
      glAccountName: row.gl_account_name,
      branchId: row.branch_id,
      branchName: row.branch_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
      },
      updatedBy: row.updated_by_id
        ? {
            id: row.updated_by_id,
            name: row.updated_by_name,
          }
        : undefined,
      payment: row.payment_status
        ? {
            status: row.payment_status,
            method: row.payment_method,
            receivedAt: row.payment_received_at,
            bankAccount: row.payment_bank_account,
            referenceNumber: row.payment_reference_number,
            notes: row.payment_notes,
          }
        : undefined,
      metadata: {
        transactionVolume: row.transaction_volume,
        commissionRate: row.commission_rate,
        settlementPeriod: row.settlement_period,
      },
      comments: [],
      attachments: [],
    }))
  } catch (error) {
    console.error("Error fetching commissions:", error)
    throw new Error("Failed to fetch commissions")
  }
}

// Create a new commission with branch information
export async function createCommission(
  input: CommissionInput,
  userId: string,
  userName: string,
  branchId?: string,
  branchName?: string,
  userRole?: string,
): Promise<Commission> {
  try {
    console.log("Creating commission with input:", input)
    console.log("User info:", { userId, userName, branchId, branchName, userRole })

    // Ensure tables exist
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      await initializeTables()
    }

    // Check if branch columns exist
    const branchColumnsExist = await checkBranchColumnsExist()
    if (!branchColumnsExist) {
      await sql`
        ALTER TABLE commissions 
        ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)
      `
    }

    // Check if reference already exists
    const referenceExists = await checkReferenceExists(input.reference)
    if (referenceExists) {
      throw new Error(
        `A commission with reference "${input.reference}" already exists. Please use a unique reference number.`,
      )
    }

    // Format the month to ensure it's a valid date
    let formattedMonth = input.month
    if (typeof input.month === "string" && input.month.match(/^\d{4}-\d{2}$/)) {
      // If it's in YYYY-MM format, add -01 to make it a valid date
      formattedMonth = `${input.month}-01`
    }

    // Ensure amount is a number and convert to string for PostgreSQL DECIMAL
    const amountValue =
      typeof input.amount === "number" ? input.amount : Number.parseFloat(input.amount?.toString() || "0")
    const amountString = amountValue.toFixed(2)

    // Always mark as paid by default
    const status = "paid"

    console.log(`Commission will be created with status: ${status} (user role: ${userRole})`)
    console.log(`Formatted month: ${formattedMonth}`)
    console.log(`Amount: ${amountString} (type: ${typeof amountString})`)
    console.log(`User ID: ${userId}, User Name: ${userName}`)
    console.log(`Branch ID: ${branchId}, Branch Name: ${branchName}`)

    // Use explicit type casting in the SQL query
    const result = await sql`
      INSERT INTO commissions (
        source, source_name, amount, month, reference, description, 
        gl_account, gl_account_name, branch_id, branch_name,
        status, created_by_id, created_by_name
      ) VALUES (
        ${input.source}::VARCHAR, 
        ${input.sourceName}::VARCHAR, 
        ${amountString}::DECIMAL(15,2), 
        ${formattedMonth}::DATE, 
        ${input.reference}::VARCHAR, 
        ${input.description || null}::TEXT, 
        ${input.glAccount || null}::VARCHAR, 
        ${input.glAccountName || null}::VARCHAR, 
        ${branchId || null}::VARCHAR, 
        ${branchName || null}::VARCHAR,
        ${status}::VARCHAR, 
        ${userId}::VARCHAR, 
        ${userName}::VARCHAR
      ) RETURNING *
    `

    const commission = result[0]

    // Add metadata if provided
    if (input.metadata) {
      await sql`
        INSERT INTO commission_metadata (
          commission_id, transaction_volume, commission_rate, settlement_period
        ) VALUES (
          ${commission.id}::UUID, 
          ${input.metadata.transactionVolume || null}::INTEGER, 
          ${input.metadata.commissionRate?.toString() || null}::VARCHAR, 
          ${input.metadata.settlementPeriod || null}::VARCHAR
        )
      `
    }

    // Since it's always marked as paid, create payment record
    await sql`
      INSERT INTO commission_payments (
        commission_id, method, received_at, notes, 
        processed_by_id, processed_by_name
      ) VALUES (
        ${commission.id}::UUID, 
        'auto_approved'::VARCHAR, 
        ${new Date().toISOString()}::TIMESTAMP WITH TIME ZONE, 
        ${"Automatically approved"}::TEXT, 
        ${userId}::VARCHAR, 
        ${userName}::VARCHAR
      )
    `

    const createdCommission = await getCommissionById(commission.id)
    console.log("Commission created successfully:", createdCommission)

    return createdCommission as Commission
  } catch (error) {
    console.error("Error creating commission:", error)

    if (error instanceof Error) {
      if (error.message.includes('duplicate key value violates unique constraint "commissions_reference_key"')) {
        throw new Error(
          `A commission with reference "${input.reference}" already exists. Please use a unique reference number.`,
        )
      }
      throw error
    }

    throw new Error("Failed to create commission")
  }
}

// Get a single commission by ID
export async function getCommissionById(id: string): Promise<Commission | null> {
  try {
    console.log("Fetching commission by ID:", id)

    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return null
    }

    const rows = await sql`
      SELECT 
        c.*,
        cp.status as payment_status,
        cp.method as payment_method,
        cp.received_at as payment_received_at,
        cp.bank_account as payment_bank_account,
        cp.reference_number as payment_reference_number,
        cp.notes as payment_notes,
        cp.processed_by_id as payment_processed_by_id,
        cp.processed_by_name as payment_processed_by_name,
        cp.processed_at as payment_processed_at,
        cm.transaction_volume,
        cm.commission_rate,
        cm.settlement_period
      FROM commissions c
      LEFT JOIN commission_payments cp ON c.id = cp.commission_id
      LEFT JOIN commission_metadata cm ON c.id = cm.commission_id
      WHERE c.id = ${id}::UUID
    `

    if (rows.length === 0) {
      return null
    }

    const row = rows[0]

    return {
      id: row.id,
      source: row.source,
      sourceName: row.source_name,
      amount: Number.parseFloat(row.amount),
      month: row.month,
      reference: row.reference,
      description: row.description,
      status: row.status as CommissionStatus,
      glAccount: row.gl_account,
      glAccountName: row.gl_account_name,
      branchId: row.branch_id,
      branchName: row.branch_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
      },
      updatedBy: row.updated_by_id
        ? {
            id: row.updated_by_id,
            name: row.updated_by_name,
          }
        : undefined,
      payment: row.payment_status
        ? {
            status: row.payment_status,
            method: row.payment_method,
            receivedAt: row.payment_received_at,
            bankAccount: row.payment_bank_account,
            referenceNumber: row.payment_reference_number,
            notes: row.payment_notes,
          }
        : undefined,
      metadata: {
        transactionVolume: row.transaction_volume,
        commissionRate: row.commission_rate,
        settlementPeriod: row.settlement_period,
      },
      comments: [],
      attachments: [],
    }
  } catch (error) {
    console.error("Error fetching commission by ID:", error)
    return null
  }
}

// Update an existing commission
export async function updateCommission(
  id: string,
  updates: Partial<CommissionInput & { status?: CommissionStatus }>,
  userId?: string,
  userName?: string,
): Promise<Commission | null> {
  try {
    console.log("Updating commission:", id, "with updates:", updates)

    // Build dynamic update query based on what fields are being updated
    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (updates.status && userId && userName) {
      updateFields.push(`status = $${paramIndex}::VARCHAR`)
      params.push(updates.status)
      paramIndex++

      updateFields.push(`updated_by_id = $${paramIndex}::VARCHAR`)
      params.push(userId)
      paramIndex++

      updateFields.push(`updated_by_name = $${paramIndex}::VARCHAR`)
      params.push(userName)
      paramIndex++
    }

    if (updates.amount !== undefined) {
      const amountString =
        typeof updates.amount === "number"
          ? updates.amount.toFixed(2)
          : Number.parseFloat(updates.amount?.toString() || "0").toFixed(2)
      updateFields.push(`amount = $${paramIndex}::DECIMAL(15,2)`)
      params.push(amountString)
      paramIndex++
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}::TEXT`)
      params.push(updates.description)
      paramIndex++
    }

    if (updates.source) {
      updateFields.push(`source = $${paramIndex}::VARCHAR`)
      params.push(updates.source)
      paramIndex++
    }

    if (updates.sourceName) {
      updateFields.push(`source_name = $${paramIndex}::VARCHAR`)
      params.push(updates.sourceName)
      paramIndex++
    }

    if (updates.reference) {
      updateFields.push(`reference = $${paramIndex}::VARCHAR`)
      params.push(updates.reference)
      paramIndex++
    }

    if (updates.month) {
      let formattedMonth = updates.month
      if (typeof updates.month === "string" && updates.month.match(/^\d{4}-\d{2}$/)) {
        formattedMonth = `${updates.month}-01`
      }
      updateFields.push(`month = $${paramIndex}::DATE`)
      params.push(formattedMonth)
      paramIndex++
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`)

    if (updateFields.length === 1) {
      // Only updated_at was added
      console.log("No fields to update")
      return await getCommissionById(id)
    }

    // Add the ID parameter for WHERE clause
    params.push(id)
    const whereParamIndex = paramIndex

    const updateQuery = `
      UPDATE commissions 
      SET ${updateFields.join(", ")}
      WHERE id = $${whereParamIndex}::UUID
    `

    console.log("Update query:", updateQuery)
    console.log("Update params:", params)

    await sql.query(updateQuery, params)

    return await getCommissionById(id)
  } catch (error) {
    console.error("Error updating commission:", error)
    throw new Error("Failed to update commission")
  }
}

// Delete a commission
export async function deleteCommission(id: string): Promise<boolean> {
  try {
    console.log("Deleting commission with ID:", id)

    // First check if the commission exists
    const commission = await getCommissionById(id)
    if (!commission) {
      console.log("Commission not found for deletion:", id)
      return false
    }

    console.log("Found commission for deletion:", commission.reference)

    // Delete related records first (this should cascade, but let's be explicit)
    try {
      await sql`DELETE FROM commission_metadata WHERE commission_id = ${id}::UUID`
      await sql`DELETE FROM commission_payments WHERE commission_id = ${id}::UUID`
      await sql`DELETE FROM commission_comments WHERE commission_id = ${id}::UUID`
    } catch (error) {
      console.error("Error deleting related commission records:", error)
      // Continue with main deletion even if related deletions fail
    }

    // Now delete the main commission record
    const result = await sql`DELETE FROM commissions WHERE id = ${id}::UUID RETURNING id`

    console.log("Delete result:", result)

    // Check if any rows were affected
    const deleted = result && result.length > 0
    console.log(`Commission deleted: ${deleted}`)

    return deleted
  } catch (error) {
    console.error("Error deleting commission:", error)
    throw new Error(`Failed to delete commission: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Mark commission as paid
export async function markCommissionPaid(
  id: string,
  userId: string,
  userName: string,
  paymentInfo: any,
): Promise<Commission | null> {
  try {
    await sql`
      UPDATE commissions 
      SET status = 'paid'::VARCHAR, 
          updated_by_id = ${userId}::VARCHAR, 
          updated_by_name = ${userName}::VARCHAR
      WHERE id = ${id}::UUID AND status = 'pending'
    `

    await sql`
      INSERT INTO commission_payments (
        commission_id, method, received_at, bank_account, reference_number, 
        notes, processed_by_id, processed_by_name
      ) VALUES (
        ${id}::UUID, 
        ${paymentInfo.method || "bank_transfer"}::VARCHAR, 
        ${paymentInfo.receivedAt || new Date().toISOString()}::TIMESTAMP WITH TIME ZONE, 
        ${paymentInfo.bankAccount || null}::VARCHAR, 
        ${paymentInfo.referenceNumber || null}::VARCHAR, 
        ${paymentInfo.notes || null}::TEXT, 
        ${userId}::VARCHAR, 
        ${userName}::VARCHAR
      )
    `

    return await getCommissionById(id)
  } catch (error) {
    console.error("Error marking commission as paid:", error)
    throw new Error("Failed to mark commission as paid")
  }
}

// Add comment to commission
export async function addComment(
  id: string,
  userId: string,
  userName: string,
  text: string,
): Promise<Commission | null> {
  try {
    await sql`
      INSERT INTO commission_comments (commission_id, text, created_by_id, created_by_name)
      VALUES (${id}::UUID, ${text}::TEXT, ${userId}::VARCHAR, ${userName}::VARCHAR)
    `

    return await getCommissionById(id)
  } catch (error) {
    console.error("Error adding comment:", error)
    throw new Error("Failed to add comment")
  }
}

// Get commission statistics with branch awareness
export async function getCommissionStatistics(
  userBranchId?: string,
  canViewAllBranches?: boolean,
): Promise<CommissionStatistics> {
  try {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      await initializeTables()
      return {
        totalAmount: 0,
        totalCount: 0,
        pendingAmount: 0,
        pendingCount: 0,
        paidAmount: 0,
        paidCount: 0,
        bySource: {},
        byMonth: {},
      }
    }

    let whereClause = ""
    const params: any[] = []

    // Apply branch filtering for non-admin users
    if (!canViewAllBranches && userBranchId) {
      whereClause = "WHERE (branch_id = $1 OR branch_id IS NULL)"
      params.push(userBranchId)
    }

    const stats = await sql.query(
      `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount
      FROM commissions
      ${whereClause}
    `,
      params,
    )

    const sourceStats = await sql.query(
      `
      SELECT 
        source,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM commissions
      ${whereClause}
      GROUP BY source
    `,
      params,
    )

    const monthStats = await sql.query(
      `
      SELECT 
        month,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM commissions
      ${whereClause}
      GROUP BY month
      ORDER BY month
    `,
      params,
    )

    const statsResult = Array.isArray(stats) ? stats : stats.rows || []
    const sourceResult = Array.isArray(sourceStats) ? sourceStats : sourceStats.rows || []
    const monthResult = Array.isArray(monthStats) ? monthStats : monthStats.rows || []

    const row = statsResult[0] || {}

    return {
      totalAmount: Number.parseFloat(row.total_amount || 0),
      totalCount: Number.parseInt(row.total_count || 0),
      pendingAmount: Number.parseFloat(row.pending_amount || 0),
      pendingCount: Number.parseInt(row.pending_count || 0),
      paidAmount: Number.parseFloat(row.paid_amount || 0),
      paidCount: Number.parseInt(row.paid_count || 0),
      bySource: sourceResult.reduce(
        (acc, row) => {
          acc[row.source] = {
            count: Number.parseInt(row.count),
            amount: Number.parseFloat(row.amount),
          }
          return acc
        },
        {} as Record<string, { count: number; amount: number }>,
      ),
      byMonth: monthResult.reduce(
        (acc, row) => {
          acc[row.month] = {
            count: Number.parseInt(row.count),
            amount: Number.parseFloat(row.amount),
          }
          return acc
        },
        {} as Record<string, { count: number; amount: number }>,
      ),
    }
  } catch (error) {
    console.error("Error fetching commission statistics:", error)
    throw new Error("Failed to fetch commission statistics")
  }
}

// Approve a commission
export async function approveCommission(
  id: string,
  userId: string,
  userName: string,
  notes?: string,
): Promise<Commission | null> {
  try {
    await sql`
      UPDATE commissions 
      SET status = 'paid'::VARCHAR, 
          updated_by_id = ${userId}::VARCHAR, 
          updated_by_name = ${userName}::VARCHAR
      WHERE id = ${id}::UUID AND status = 'pending'
    `

    // Add approval comment
    if (notes) {
      await addComment(id, userId, userName, `Approved: ${notes}`)
    } else {
      await addComment(id, userId, userName, "Commission approved")
    }

    // Create payment record
    await sql`
      INSERT INTO commission_payments (
        commission_id, method, received_at, notes, 
        processed_by_id, processed_by_name
      ) VALUES (
        ${id}::UUID, 
        'approved'::VARCHAR, 
        ${new Date().toISOString()}::TIMESTAMP WITH TIME ZONE, 
        ${notes || "Commission approved"}::TEXT, 
        ${userId}::VARCHAR, 
        ${userName}::VARCHAR
      )
    `

    return await getCommissionById(id)
  } catch (error) {
    console.error("Error approving commission:", error)
    throw new Error("Failed to approve commission")
  }
}

// Reject a commission
export async function rejectCommission(
  id: string,
  userId: string,
  userName: string,
  reason: string,
): Promise<Commission | null> {
  try {
    await sql`
      UPDATE commissions 
      SET status = 'pending'::VARCHAR, 
          updated_by_id = ${userId}::VARCHAR, 
          updated_by_name = ${userName}::VARCHAR
      WHERE id = ${id}::UUID
    `

    // Add rejection comment
    await addComment(id, userId, userName, `Rejected: ${reason}`)

    return await getCommissionById(id)
  } catch (error) {
    console.error("Error rejecting commission:", error)
    throw new Error("Failed to reject commission")
  }
}
