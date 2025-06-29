import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface ExpenseHead {
  id: string
  name: string
  category: string
  description?: string
  gl_account_code?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getAllExpenseHeads(): Promise<ExpenseHead[]> {
  try {
    console.log("Fetching all expense heads from database...")

    const result = await sql`
      SELECT 
        id,
        name,
        category,
        description,
        gl_account_code,
        is_active,
        created_at,
        updated_at
      FROM expense_heads 
      ORDER BY name ASC
    `

    console.log(`Found ${result.length} expense heads`)
    return result as ExpenseHead[]
  } catch (error) {
    console.error("Error fetching expense heads:", error)

    // Return mock data if database fails
    const mockData = [
      {
        id: "1",
        name: "Office Supplies",
        category: "operational",
        description: "General office supplies and stationery",
        gl_account_code: "6001",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Utilities",
        category: "operational",
        description: "Electricity, water, internet bills",
        gl_account_code: "6002",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Travel & Transport",
        category: "operational",
        description: "Business travel and transportation costs",
        gl_account_code: "6003",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    console.log("Using mock expense heads data")
    return mockData
  }
}

export async function getExpenseHeadById(id: string): Promise<ExpenseHead | null> {
  try {
    console.log(`Fetching expense head with id: ${id}`)

    const result = await sql`
      SELECT 
        id,
        name,
        category,
        description,
        gl_account_code,
        is_active,
        created_at,
        updated_at
      FROM expense_heads 
      WHERE id = ${id}
    `

    return (result[0] as ExpenseHead) || null
  } catch (error) {
    console.error(`Error fetching expense head ${id}:`, error)
    return null
  }
}

export async function createExpenseHead(data: Partial<ExpenseHead>): Promise<ExpenseHead | null> {
  try {
    console.log("Creating expense head:", data)

    const result = await sql`
      INSERT INTO expense_heads (
        name,
        category,
        description,
        gl_account_code,
        is_active
      ) VALUES (
        ${data.name},
        ${data.category},
        ${data.description || null},
        ${data.gl_account_code || null},
        ${data.is_active ?? true}
      )
      RETURNING 
        id,
        name,
        category,
        description,
        gl_account_code,
        is_active,
        created_at,
        updated_at
    `

    console.log("Created expense head:", result[0])
    return result[0] as ExpenseHead
  } catch (error) {
    console.error("Error creating expense head:", error)
    return null
  }
}

export async function updateExpenseHead(id: string, data: Partial<ExpenseHead>): Promise<ExpenseHead | null> {
  try {
    console.log(`Updating expense head ${id}:`, data)

    // Use individual update queries based on what fields are provided
    let result

    if (
      data.name !== undefined &&
      data.category !== undefined &&
      data.description !== undefined &&
      data.is_active !== undefined
    ) {
      // Update all fields
      result = await sql`
        UPDATE expense_heads 
        SET 
          name = ${data.name},
          category = ${data.category},
          description = ${data.description},
          is_active = ${data.is_active},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          name,
          category,
          description,
          gl_account_code,
          is_active,
          created_at,
          updated_at
      `
    } else if (data.name !== undefined) {
      // Update just name
      result = await sql`
        UPDATE expense_heads 
        SET 
          name = ${data.name},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          name,
          category,
          description,
          gl_account_code,
          is_active,
          created_at,
          updated_at
      `
    } else if (data.category !== undefined) {
      // Update just category
      result = await sql`
        UPDATE expense_heads 
        SET 
          category = ${data.category},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          name,
          category,
          description,
          gl_account_code,
          is_active,
          created_at,
          updated_at
      `
    } else if (data.is_active !== undefined) {
      // Update just active status
      result = await sql`
        UPDATE expense_heads 
        SET 
          is_active = ${data.is_active},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING 
          id,
          name,
          category,
          description,
          gl_account_code,
          is_active,
          created_at,
          updated_at
      `
    } else {
      // No valid fields to update
      console.log("No valid fields to update")
      return await getExpenseHeadById(id)
    }

    if (result && result.length > 0) {
      console.log("Updated expense head:", result[0])
      return result[0] as ExpenseHead
    } else {
      console.log("No expense head found to update")
      return null
    }
  } catch (error) {
    console.error(`Error updating expense head ${id}:`, error)
    return null
  }
}

export async function deleteExpenseHead(id: string): Promise<boolean> {
  try {
    console.log(`Deleting expense head ${id}`)

    // Check if expense head is being used
    const usageCheck = await sql`
      SELECT COUNT(*) as count 
      FROM expenses 
      WHERE expense_head_id = ${id}
    `

    if (usageCheck[0]?.count > 0) {
      throw new Error("Cannot delete expense head that is being used in expenses")
    }

    const result = await sql`
      DELETE FROM expense_heads 
      WHERE id = ${id}
    `

    console.log(`Deleted expense head ${id}`)
    return true
  } catch (error) {
    console.error(`Error deleting expense head ${id}:`, error)
    throw error
  }
}
