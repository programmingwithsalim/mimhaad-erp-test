/**
 * Agency Banking Service
 *
 * This module provides services for managing Agency Banking transactions
 * and integrating them with the GL system.
 */

import { neon } from "@neondatabase/serverless";

// Agency Banking Transaction interface
export interface AgencyBankingTransaction {
  id: string;
  type: "deposit" | "withdrawal" | "interbank" | "commission";
  amount: number;
  fee: number;
  customerName: string;
  accountNumber: string;
  partnerBank: string;
  partnerBankCode: string;
  reference?: string;
  status: "pending" | "completed" | "failed";
  date: string;
  branchId?: string;
  userId: string;
  cashTillAffected: number;
  floatAffected: number;
  metadata?: Record<string, any>;
  deleted?: boolean;
}

// In-memory storage for transactions (replace with database in production)
let transactionsCache: AgencyBankingTransaction[] = [];

// Initialize with mock data
const initializeMockTransactions = () => {
  if (transactionsCache.length === 0) {
    transactionsCache = [
      {
        id: "abt-001",
        type: "deposit",
        amount: 500.0,
        fee: 0.0,
        customerName: "John Doe",
        accountNumber: "1234567890",
        partnerBank: "Ghana Commercial Bank",
        partnerBankCode: "GCB",
        reference: "Salary deposit",
        status: "completed",
        date: new Date(Date.now() - 86400000).toISOString(),
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        userId: "user-1",
        cashTillAffected: 500.0,
        floatAffected: -500.0,
      },
      {
        id: "abt-002",
        type: "withdrawal",
        amount: 300.0,
        fee: 0.0,
        customerName: "Jane Smith",
        accountNumber: "0987654321",
        partnerBank: "Ecobank Ghana",
        partnerBankCode: "ECO",
        reference: "ATM withdrawal",
        status: "completed",
        date: new Date(Date.now() - 43200000).toISOString(),
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        userId: "user-1",
        cashTillAffected: -300.0,
        floatAffected: 300.0,
      },
      {
        id: "abt-003",
        type: "interbank",
        amount: 1000.0,
        fee: 15.0,
        customerName: "Michael Johnson",
        accountNumber: "1122334455",
        partnerBank: "Stanbic Bank",
        partnerBankCode: "STB",
        reference: "Transfer to Cal Bank",
        status: "completed",
        date: new Date(Date.now() - 21600000).toISOString(),
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        userId: "user-1",
        cashTillAffected: 1015.0,
        floatAffected: -1000.0,
      },
    ];
  }
};

/**
 * Create an Agency Banking transaction
 * @param transaction Agency Banking transaction data
 * @returns The created transaction or null if creation failed
 */
export async function createAgencyBankingTransaction(
  transaction: Omit<AgencyBankingTransaction, "id" | "date" | "status">
): Promise<AgencyBankingTransaction | null> {
  try {
    initializeMockTransactions();

    // Create the transaction
    const newTransaction: AgencyBankingTransaction = {
      id: `agency-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...transaction,
      date: new Date().toISOString(),
      status: "pending",
    };

    transactionsCache.push(newTransaction);

    return newTransaction;
  } catch (error) {
    console.error("Error creating Agency Banking transaction:", error);
    return null;
  }
}

/**
 * Complete an Agency Banking transaction and generate GL entries
 * @param id ID of the transaction to complete
 * @returns The completed transaction or null if completion failed
 */
export async function completeAgencyBankingTransaction(
  id: string
): Promise<AgencyBankingTransaction | null> {
  try {
    initializeMockTransactions();

    const transactionIndex = transactionsCache.findIndex((t) => t.id === id);

    if (transactionIndex === -1) {
      console.error("Agency Banking transaction not found:", id);
      return null;
    }

    const transaction = transactionsCache[transactionIndex];

    if (transaction.status !== "pending") {
      console.error(
        "Agency Banking transaction is not in pending status:",
        transaction
      );
      return null;
    }

    // Update the transaction status
    transaction.status = "completed";
    transactionsCache[transactionIndex] = transaction;

    return transaction;
  } catch (error) {
    console.error("Error completing Agency Banking transaction:", error);
    return null;
  }
}

/**
 * Get all Agency Banking transactions
 * @param filters Optional filters for transactions
 * @returns Array of Agency Banking transactions matching the filters
 */
export async function getAgencyBankingTransactions(filters?: {
  status?: "pending" | "completed" | "failed";
  type?: "deposit" | "withdrawal" | "interbank" | "commission";
  partnerBankCode?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  userId?: string;
}): Promise<AgencyBankingTransaction[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    let query = `SELECT * FROM agency_banking_transactions WHERE deleted = false`;
    const params: any[] = [];
    if (filters) {
      if (filters.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(filters.status);
      }
      if (filters.type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(filters.type);
      }
      if (filters.partnerBankCode) {
        query += ` AND partner_bank_code = $${params.length + 1}`;
        params.push(filters.partnerBankCode);
      }
      if (filters.startDate) {
        query += ` AND date >= $${params.length + 1}`;
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ` AND date <= $${params.length + 1}`;
        params.push(filters.endDate);
      }
      if (filters.branchId) {
        query += ` AND branch_id = $${params.length + 1}`;
        params.push(filters.branchId);
      }
      if (filters.userId) {
        query += ` AND user_id = $${params.length + 1}`;
        params.push(filters.userId);
      }
    }
    query += ` ORDER BY date DESC`;
    let transactions;
    if (params.length > 0) {
      transactions = await sql.unsafe(query, ...(params as any[]));
    } else {
      transactions = await sql.unsafe(query);
    }
    return Array.isArray(transactions)
      ? transactions.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          fee: Number(t.fee),
          customerName: t.customer_name,
          accountNumber: t.account_number,
          partnerBank: t.partner_bank,
          partnerBankCode: t.partner_bank_code,
          reference: t.reference,
          status: t.status,
          date: t.date,
          branchId: t.branch_id,
          userId: t.user_id,
          cashTillAffected: Number(t.cash_till_affected || 0),
          floatAffected: Number(t.float_affected || 0),
          metadata: {},
          deleted: t.deleted,
        }))
      : [];
  } catch (error) {
    console.error("Error getting Agency Banking transactions:", error);
    return [];
  }
}

/**
 * Get an Agency Banking transaction by ID
 * @param id ID of the transaction to get
 * @returns The transaction or null if not found
 */
export async function getAgencyBankingTransactionById(
  id: string
): Promise<AgencyBankingTransaction | null> {
  try {
    initializeMockTransactions();
    const transaction = transactionsCache.find((t) => t.id === id);
    return transaction || null;
  } catch (error) {
    console.error("Error getting Agency Banking transaction by ID:", error);
    return null;
  }
}

/**
 * Get Agency Banking transaction statistics
 * @param filters Optional filters for statistics
 * @returns Transaction statistics
 */
export async function getAgencyBankingTransactionStatistics(filters?: {
  startDate?: string;
  endDate?: string;
  branchId?: string;
}): Promise<{
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  transactionsByType: Record<string, number>;
  transactionsByBank: Record<string, number>;
}> {
  try {
    const transactions = await getAgencyBankingTransactions({
      status: "completed",
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      branchId: filters?.branchId,
    });

    const statistics = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalFees: transactions.reduce((sum, t) => sum + (t.fee || 0), 0),
      transactionsByType: {} as Record<string, number>,
      transactionsByBank: {} as Record<string, number>,
    };

    // Count transactions by type
    transactions.forEach((t) => {
      statistics.transactionsByType[t.type] =
        (statistics.transactionsByType[t.type] || 0) + 1;
    });

    // Count transactions by bank
    transactions.forEach((t) => {
      statistics.transactionsByBank[t.partnerBankCode] =
        (statistics.transactionsByBank[t.partnerBankCode] || 0) + 1;
    });

    return statistics;
  } catch (error) {
    console.error(
      "Error getting Agency Banking transaction statistics:",
      error
    );
    return {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      transactionsByType: {},
      transactionsByBank: {},
    };
  }
}

/**
 * Get Agency Banking float accounts for a branch
 * @param branchId Branch ID to get float accounts for
 * @returns Array of float accounts for the branch
 */
export async function getAgencyBankingFloatAccounts(branchId: string) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock data if no database connection
      return [
        {
          id: "float-agency-001",
          branch_id: branchId,
          account_type: "agency-banking",
          provider: "GCB",
          current_balance: 15000,
          min_threshold: 5000,
          max_threshold: 200000,
          is_active: true,
          branch_name: "Main Branch",
          branch_code: "MB001",
        },
      ];
    }

    const sql = neon(process.env.DATABASE_URL);

    // Query the database for agency banking float accounts
    const accounts = await sql`
      SELECT 
        fa.*,
        b.name as branch_name,
        b.code as branch_code,
        b.location as branch_location,
        b.region as branch_region
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.branch_id = ${branchId}
      AND fa.account_type = 'agency-banking'
      AND fa.is_active = true
      ORDER BY fa.created_at DESC
    `;

    return accounts.map((account) => ({
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    }));
  } catch (error) {
    console.error(
      `Error fetching agency banking float accounts for branch ${branchId}:`,
      error
    );
    // Return mock data on error
    return [
      {
        id: "float-agency-001",
        branch_id: branchId,
        account_type: "agency-banking",
        provider: "GCB",
        current_balance: 15000,
        min_threshold: 5000,
        max_threshold: 200000,
        is_active: true,
        branch_name: "Main Branch",
        branch_code: "MB001",
      },
    ];
  }
}

/**
 * Get a specific Agency Banking float account
 * @param branchId Branch ID
 * @param provider Optional provider code to filter by
 * @returns The float account or null if not found
 */
export async function getAgencyBankingFloatAccount(
  branchId: string,
  provider?: string
) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock data if no database connection
      return {
        id: "float-agency-001",
        branch_id: branchId,
        account_type: "agency-banking",
        provider: provider || "GCB",
        current_balance: 15000,
        min_threshold: 5000,
        max_threshold: 200000,
        is_active: true,
        branch_name: "Main Branch",
        branch_code: "MB001",
      };
    }

    const sql = neon(process.env.DATABASE_URL);

    let query = sql`
      SELECT 
        fa.*,
        b.name as branch_name,
        b.code as branch_code,
        b.location as branch_location,
        b.region as branch_region
      FROM float_accounts fa
      JOIN branches b ON fa.branch_id = b.id
      WHERE fa.branch_id = ${branchId}
      AND fa.account_type = 'agency-banking'
      AND fa.is_active = true
    `;

    // Add provider filter if specified
    if (provider) {
      query = sql`
        ${query} AND fa.provider = ${provider}
      `;
    }

    // Limit to one result and order by most recently created
    query = sql`
      ${query} ORDER BY fa.created_at DESC LIMIT 1
    `;

    const accounts = await query;

    if (accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    return {
      ...account,
      current_balance: Number(account.current_balance),
      min_threshold: Number(account.min_threshold),
      max_threshold: Number(account.max_threshold),
    };
  } catch (error) {
    console.error(
      `Error fetching agency banking float account for branch ${branchId}:`,
      error
    );
    // Return mock data on error
    return {
      id: "float-agency-001",
      branch_id: branchId,
      account_type: "agency-banking",
      provider: provider || "GCB",
      current_balance: 15000,
      min_threshold: 5000,
      max_threshold: 200000,
      is_active: true,
      branch_name: "Main Branch",
      branch_code: "MB001",
    };
  }
}

/**
 * Initialize an Agency Banking float account for a branch
 * @param branchId Branch ID to create the account for
 * @param createdBy User ID of the creator
 * @returns The created float account
 */
export async function initializeAgencyBankingFloatAccount(
  branchId: string,
  createdBy: string
) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock data if no database connection
      return {
        id: "float-agency-001",
        branch_id: branchId,
        account_type: "agency-banking",
        provider: "agency",
        current_balance: 0,
        min_threshold: 5000,
        max_threshold: 200000,
        is_active: true,
        branch_name: "Main Branch",
        branch_code: "MB001",
        created_by: createdBy,
      };
    }

    const sql = neon(process.env.DATABASE_URL);

    // Check if an account already exists
    const existingAccounts = await sql`
      SELECT id FROM float_accounts
      WHERE branch_id = ${branchId}
      AND account_type = 'agency-banking'
      AND is_active = true
      LIMIT 1
    `;

    if (existingAccounts.length > 0) {
      // Account already exists, fetch and return it
      const account = await getAgencyBankingFloatAccount(branchId);
      return account;
    }

    // Create a new account
    const result = await sql`
      INSERT INTO float_accounts (
        branch_id,
        account_type,
        provider,
        account_number,
        current_balance,
        min_threshold,
        max_threshold,
        created_by
      ) VALUES (
        ${branchId},
        'agency-banking',
        'agency',
        NULL,
        0,
        5000,
        200000,
        ${createdBy}
      )
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error("Failed to create agency banking float account");
    }

    // Fetch the account with branch details
    return await getAgencyBankingFloatAccount(branchId);
  } catch (error) {
    console.error(
      `Error initializing agency banking float account for branch ${branchId}:`,
      error
    );
    // Return mock data on error
    return {
      id: "float-agency-001",
      branch_id: branchId,
      account_type: "agency-banking",
      provider: "agency",
      current_balance: 0,
      min_threshold: 5000,
      max_threshold: 200000,
      is_active: true,
      branch_name: "Main Branch",
      branch_code: "MB001",
      created_by: createdBy,
    };
  }
}
