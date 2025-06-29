import { fileExists, writeJsonFile } from "./file-utils"

// File paths
const EXPENSES_FILE_PATH = "data/expenses.json"
const EXPENSE_HEADS_FILE_PATH = "data/expense_heads.json"

// Sample expense heads data
const sampleExpenseHeads = {
  expense_heads: [
    {
      id: "exp-head-001",
      name: "Office Supplies",
      category: "Administrative",
      description: "General office supplies and stationery",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "exp-head-002",
      name: "Utilities",
      category: "Operational",
      description: "Electricity, water, and other utility bills",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "exp-head-003",
      name: "Rent",
      category: "Facilities",
      description: "Office and branch rent payments",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
}

// Sample expenses data
const sampleExpenses = {
  expenses: [
    {
      id: "exp-001",
      branch_id: "branch-001",
      expense_head_id: "exp-head-001",
      amount: 250.0,
      description: "Monthly office supplies",
      reference_number: "EXP-2023-001",
      payment_source: "cash",
      payment_account_id: null,
      attachment_url: null,
      status: "approved",
      created_by: "user-001",
      approved_by: "user-002",
      expense_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "exp-002",
      branch_id: "branch-002",
      expense_head_id: "exp-head-002",
      amount: 1200.0,
      description: "Electricity bill for March",
      reference_number: "EXP-2023-002",
      payment_source: "bank_transfer",
      payment_account_id: "float-001",
      attachment_url: null,
      status: "pending",
      created_by: "user-003",
      approved_by: null,
      expense_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
}

// Initialize expense data files
export async function seedExpenseData() {
  try {
    // Check if expense heads file exists
    const expenseHeadsExists = await fileExists(EXPENSE_HEADS_FILE_PATH)
    if (!expenseHeadsExists) {
      console.log("Creating expense heads file with sample data...")
      await writeJsonFile(EXPENSE_HEADS_FILE_PATH, sampleExpenseHeads)
    }

    // Check if expenses file exists
    const expensesExists = await fileExists(EXPENSES_FILE_PATH)
    if (!expensesExists) {
      console.log("Creating expenses file with sample data...")
      await writeJsonFile(EXPENSES_FILE_PATH, sampleExpenses)
    }

    return true
  } catch (error) {
    console.error("Error seeding expense data:", error)
    return false
  }
}
