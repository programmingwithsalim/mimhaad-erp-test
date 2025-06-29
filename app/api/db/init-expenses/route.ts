import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("Initializing expenses database...")

    // Step 1: Drop existing tables
    console.log("Dropping existing tables...")
    await sql`
      DROP TABLE IF EXISTS expense_attachments CASCADE
    `
    await sql`
      DROP TABLE IF EXISTS expense_approvals CASCADE
    `
    await sql`
      DROP TABLE IF EXISTS expenses CASCADE
    `
    await sql`
      DROP TABLE IF EXISTS expense_heads CASCADE
    `

    // Step 2: Create expense_heads table
    console.log("Creating expense_heads table...")
    await sql`
      CREATE TABLE expense_heads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          gl_account_code VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Step 3: Create expenses table
    console.log("Creating expenses table...")
    await sql`
      CREATE TABLE expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_number VARCHAR(50) UNIQUE NOT NULL,
          branch_id UUID NOT NULL,
          expense_head_id UUID NOT NULL REFERENCES expense_heads(id),
          amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL,
          expense_date DATE NOT NULL,
          payment_source VARCHAR(50) NOT NULL,
          payment_account_id UUID,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
          created_by UUID NOT NULL,
          approved_by UUID,
          approved_at TIMESTAMP WITH TIME ZONE,
          paid_by UUID,
          paid_at TIMESTAMP WITH TIME ZONE,
          rejected_by UUID,
          rejected_at TIMESTAMP WITH TIME ZONE,
          rejection_reason TEXT,
          gl_journal_entry_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Step 4: Create expense_approvals table
    console.log("Creating expense_approvals table...")
    await sql`
      CREATE TABLE expense_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          approver_id UUID NOT NULL,
          action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected')),
          comments TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Step 5: Create expense_attachments table
    console.log("Creating expense_attachments table...")
    await sql`
      CREATE TABLE expense_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER,
          file_type VARCHAR(100),
          uploaded_by UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Step 6: Create indexes (one by one)
    console.log("Creating indexes...")
    await sql`CREATE INDEX idx_expenses_branch_id ON expenses(branch_id)`
    await sql`CREATE INDEX idx_expenses_expense_head_id ON expenses(expense_head_id)`
    await sql`CREATE INDEX idx_expenses_status ON expenses(status)`
    await sql`CREATE INDEX idx_expenses_expense_date ON expenses(expense_date)`
    await sql`CREATE INDEX idx_expenses_created_by ON expenses(created_by)`
    await sql`CREATE INDEX idx_expenses_reference_number ON expenses(reference_number)`
    await sql`CREATE INDEX idx_expense_heads_category ON expense_heads(category)`
    await sql`CREATE INDEX idx_expense_heads_is_active ON expense_heads(is_active)`
    await sql`CREATE INDEX idx_expense_approvals_expense_id ON expense_approvals(expense_id)`
    await sql`CREATE INDEX idx_expense_attachments_expense_id ON expense_attachments(expense_id)`

    // Step 7: Create update function and triggers
    console.log("Creating triggers...")
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    await sql`
      CREATE TRIGGER update_expense_heads_updated_at 
      BEFORE UPDATE ON expense_heads 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `

    await sql`
      CREATE TRIGGER update_expenses_updated_at 
      BEFORE UPDATE ON expenses 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `

    // Step 8: Insert default expense heads (one by one)
    console.log("Inserting default expense heads...")

    const expenseHeads = [
      {
        name: "Office Supplies",
        category: "Administrative",
        description: "Stationery, printing, and office materials",
        gl_account_code: "6100",
      },
      {
        name: "Utilities",
        category: "Operational",
        description: "Electricity, water, internet, and phone bills",
        gl_account_code: "6200",
      },
      {
        name: "Rent",
        category: "Operational",
        description: "Office and branch rent payments",
        gl_account_code: "6300",
      },
      {
        name: "Marketing",
        category: "Marketing",
        description: "Advertising, promotions, and marketing materials",
        gl_account_code: "6400",
      },
      {
        name: "Travel & Transport",
        category: "Administrative",
        description: "Business travel, fuel, and transportation costs",
        gl_account_code: "6500",
      },
      {
        name: "Professional Services",
        category: "Administrative",
        description: "Legal, accounting, and consulting fees",
        gl_account_code: "6600",
      },
      {
        name: "Equipment Maintenance",
        category: "Operational",
        description: "Repair and maintenance of equipment",
        gl_account_code: "6700",
      },
      {
        name: "Staff Training",
        category: "Human Resources",
        description: "Employee training and development costs",
        gl_account_code: "6800",
      },
      {
        name: "Insurance",
        category: "Administrative",
        description: "Business insurance premiums",
        gl_account_code: "6900",
      },
      {
        name: "Bank Charges",
        category: "Financial",
        description: "Banking fees and transaction charges",
        gl_account_code: "7100",
      },
      {
        name: "Power Purchase",
        category: "Operational",
        description: "Electricity credit purchases for resale",
        gl_account_code: "5100",
      },
      {
        name: "Telecommunications",
        category: "Operational",
        description: "Airtime and data purchases for resale",
        gl_account_code: "5200",
      },
      {
        name: "Cash Transportation",
        category: "Security",
        description: "Armored car and cash-in-transit services",
        gl_account_code: "7200",
      },
      {
        name: "Security Services",
        category: "Security",
        description: "Security guard and surveillance costs",
        gl_account_code: "7300",
      },
      {
        name: "Cleaning Services",
        category: "Operational",
        description: "Janitorial and cleaning services",
        gl_account_code: "7400",
      },
    ]

    for (const head of expenseHeads) {
      await sql`
        INSERT INTO expense_heads (name, category, description, gl_account_code)
        VALUES (${head.name}, ${head.category}, ${head.description}, ${head.gl_account_code})
      `
    }

    console.log("Expenses database initialized successfully!")

    return NextResponse.json({
      success: true,
      message: "Expenses database initialized successfully",
      tables_created: ["expense_heads", "expenses", "expense_approvals", "expense_attachments"],
      expense_heads_count: expenseHeads.length,
    })
  } catch (error) {
    console.error("Error initializing expenses database:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize expenses database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
