import { NextResponse } from "next/server"
import { GLDatabase } from "@/lib/gl-database"

export async function POST() {
  try {
    // Define default GL accounts
    const defaultAccounts = [
      // Asset accounts
      {
        code: "1000",
        name: "Assets",
        type: "Asset" as const,
        description: "Asset accounts",
        isActive: true,
      },
      {
        code: "1001",
        name: "Cash",
        type: "Asset" as const,
        parentId: "1000",
        description: "Cash on hand",
        isActive: true,
      },
      {
        code: "1002",
        name: "Bank",
        type: "Asset" as const,
        parentId: "1000",
        description: "Cash in bank",
        isActive: true,
      },
      {
        code: "1003",
        name: "Float Accounts",
        type: "Asset" as const,
        parentId: "1000",
        description: "Float accounts for various services",
        isActive: true,
      },
      {
        code: "1004",
        name: "Accounts Receivable",
        type: "Asset" as const,
        parentId: "1000",
        description: "Amounts owed to the company",
        isActive: true,
      },

      // Liability accounts
      {
        code: "2000",
        name: "Liabilities",
        type: "Liability" as const,
        description: "Liability accounts",
        isActive: true,
      },
      {
        code: "2001",
        name: "Customer Liability",
        type: "Liability" as const,
        parentId: "2000",
        description: "Amounts owed to customers",
        isActive: true,
      },
      {
        code: "2002",
        name: "Merchant Payable",
        type: "Liability" as const,
        parentId: "2000",
        description: "Amounts owed to merchants",
        isActive: true,
      },
      {
        code: "2003",
        name: "Bank Partner Liability",
        type: "Liability" as const,
        parentId: "2000",
        description: "Amounts owed to bank partners",
        isActive: true,
      },
      {
        code: "2004",
        name: "Commission Payable",
        type: "Liability" as const,
        parentId: "2000",
        description: "Commissions owed to agents",
        isActive: true,
      },

      // Equity accounts
      {
        code: "3000",
        name: "Equity",
        type: "Equity" as const,
        description: "Equity accounts",
        isActive: true,
      },
      {
        code: "3001",
        name: "Capital",
        type: "Equity" as const,
        parentId: "3000",
        description: "Owner's capital",
        isActive: true,
      },
      {
        code: "3002",
        name: "Retained Earnings",
        type: "Equity" as const,
        parentId: "3000",
        description: "Accumulated earnings",
        isActive: true,
      },

      // Revenue accounts
      {
        code: "4000",
        name: "Revenue",
        type: "Revenue" as const,
        description: "Revenue accounts",
        isActive: true,
      },
      {
        code: "4001",
        name: "MoMo Revenue",
        type: "Revenue" as const,
        parentId: "4000",
        description: "Revenue from Mobile Money services",
        isActive: true,
      },
      {
        code: "4002",
        name: "Agency Banking Revenue",
        type: "Revenue" as const,
        parentId: "4000",
        description: "Revenue from Agency Banking services",
        isActive: true,
      },
      {
        code: "4003",
        name: "Fee Income",
        type: "Revenue" as const,
        parentId: "4000",
        description: "Income from transaction fees",
        isActive: true,
      },

      // Expense accounts
      {
        code: "5000",
        name: "Expenses",
        type: "Expense" as const,
        description: "Expense accounts",
        isActive: true,
      },
      {
        code: "5001",
        name: "General Expenses",
        type: "Expense" as const,
        parentId: "5000",
        description: "General operating expenses",
        isActive: true,
      },
      {
        code: "5002",
        name: "Commission Expense",
        type: "Expense" as const,
        parentId: "5000",
        description: "Commissions paid to agents",
        isActive: true,
      },
    ]

    // Create accounts
    const createdAccounts = []

    for (const account of defaultAccounts) {
      try {
        // Check if account already exists
        const existingAccount = await GLDatabase.getGLAccountByCode(account.code)

        if (existingAccount) {
          createdAccounts.push({ ...existingAccount, status: "already_exists" })
          continue
        }

        // Create account
        const createdAccount = await GLDatabase.createGLAccount(account)
        createdAccounts.push({ ...createdAccount, status: "created" })
      } catch (error) {
        console.error(`Error creating account ${account.code}:`, error)
        createdAccounts.push({
          ...account,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json({ accounts: createdAccounts })
  } catch (error) {
    console.error("Error in POST /api/gl/seed:", error)
    return NextResponse.json({ error: "Failed to seed GL accounts" }, { status: 500 })
  }
}
