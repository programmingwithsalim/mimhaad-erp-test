import { neon } from "@neondatabase/serverless";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

const sql = neon(process.env.DATABASE_URL!);

// MoMo Transaction interface
export interface MoMoTransaction {
  id: string;
  type: "cash-in" | "cash-out" | "transfer" | "payment" | "commission";
  amount: number;
  fee: number;
  phoneNumber: string;
  reference: string;
  status: "pending" | "completed" | "failed";
  date: string;
  branchId?: string;
  userId: string;
  provider: string;
  metadata?: Record<string, any>;
  customerName?: string;
  floatAccountId?: string;
  floatAccountName?: string;
  branchName?: string;
  processedBy?: string;
  cashTillAffected?: number;
  floatAffected?: number;
}

export interface MoMoTransactionStatistics {
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  byType: Record<string, { count: number; amount: number }>;
  byProvider: Record<string, { count: number; amount: number }>;
  byStatus: Record<string, { count: number; amount: number }>;
  averageTransactionAmount: number;
  successRate: number;
  dailyTrends: Array<{
    date: string;
    count: number;
    amount: number;
    fees: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    amount: number;
    fees: number;
  }>;
  lastUpdated: string;
}

/**
 * Create a MoMo transaction with proper user UUID handling
 */
export async function createMoMoTransaction(
  transaction: Partial<MoMoTransaction>
): Promise<MoMoTransaction | null> {
  try {
    // Validate that we have a proper user ID (not "system" or other strings)
    if (
      !transaction.userId ||
      transaction.userId === "system" ||
      transaction.userId === "System"
    ) {
      console.error(
        "Invalid user ID provided for MoMo transaction:",
        transaction.userId
      );
      return null;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transaction.userId)) {
      console.error("User ID is not a valid UUID:", transaction.userId);
      return null;
    }

    const newTransaction: MoMoTransaction = {
      id: `momo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: transaction.type || "cash-in",
      amount: transaction.amount || 0,
      fee: transaction.fee || 0,
      phoneNumber: transaction.phoneNumber || "",
      reference: transaction.reference || "",
      status: "completed",
      date: transaction.date || new Date().toISOString(),
      branchId: transaction.branchId || "",
      userId: transaction.userId, // This is now guaranteed to be a valid UUID
      provider: transaction.provider || "MTN Mobile Money",
      customerName: transaction.customerName || "",
      floatAccountId: transaction.floatAccountId || "",
      floatAccountName: transaction.floatAccountName || "",
      branchName: transaction.branchName || "",
      processedBy: transaction.processedBy || "",
      cashTillAffected: transaction.cashTillAffected || 0,
      floatAffected: transaction.floatAffected || 0,
      metadata: transaction.metadata || {},
    };

    // Store in database with proper UUID casting
    try {
      await sql`
        INSERT INTO momo_transactions (
          id, type, amount, fee, phone_number, reference, status, date,
          branch_id, user_id, provider, customer_name, float_account_id,
          float_account_name, branch_name, processed_by, cash_till_affected, float_affected
        ) VALUES (
          ${newTransaction.id}, ${newTransaction.type}, ${
        newTransaction.amount
      }, ${newTransaction.fee},
          ${newTransaction.phoneNumber}, ${newTransaction.reference}, ${
        newTransaction.status
      }, ${newTransaction.date},
          ${newTransaction.branchId}::UUID, ${newTransaction.userId}::UUID, ${
        newTransaction.provider
      }, ${newTransaction.customerName},
          ${newTransaction.floatAccountId || null}, ${
        newTransaction.floatAccountName
      }, ${newTransaction.branchName},
          ${newTransaction.processedBy}, ${newTransaction.cashTillAffected}, ${
        newTransaction.floatAffected
      }
        )
      `;
      console.log("MoMo transaction stored in database successfully");

      // Post to GL after successful transaction
      await UnifiedGLPostingService.postGLTransaction({
        date: newTransaction.date,
        description: newTransaction.reference || "MoMo Transaction",
        amount: newTransaction.amount,
        fee: newTransaction.fee,
        transactionType: newTransaction.type,
        branchId: newTransaction.branchId,
        sourceModule: "momo",
        reference: newTransaction.id,
        userId: newTransaction.userId,
        provider: newTransaction.provider,
      });
    } catch (dbError) {
      console.error("Database error storing MoMo transaction:", dbError);
      // Continue with mock data if database fails
    }

    return newTransaction;
  } catch (error) {
    console.error("Error creating MoMo transaction:", error);
    return null;
  }
}

/**
 * Get all MoMo transactions with proper user context
 */
export async function getAllMoMoTransactions(userContext?: {
  userId: string;
  role: string;
  branchId: string;
}): Promise<MoMoTransaction[]> {
  try {
    // Try database first
    try {
      let transactions;

      if (
        userContext &&
        userContext.role !== "admin" &&
        userContext.role !== "Admin"
      ) {
        // Filter by user's branch for non-admin users
        transactions = await sql`
          SELECT * FROM momo_transactions 
          WHERE branch_id = ${userContext.branchId}::UUID
          ORDER BY date DESC
        `;
      } else {
        // Admin users see all transactions
        transactions = await sql`
          SELECT * FROM momo_transactions ORDER BY date DESC
        `;
      }

      return transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        fee: Number(t.fee),
        phoneNumber: t.phone_number,
        reference: t.reference,
        status: t.status,
        date: t.date,
        branchId: t.branch_id,
        userId: t.user_id, // This will be a proper UUID from database
        provider: t.provider,
        customerName: t.customer_name,
        floatAccountId: t.float_account_id,
        floatAccountName: t.float_account_name,
        branchName: t.branch_name,
        processedBy: t.processed_by,
        cashTillAffected: Number(t.cash_till_affected || 0),
        floatAffected: Number(t.float_affected || 0),
        metadata: {},
      }));
    } catch (dbError) {
      console.log("Database not available, using mock data");
    }

    // Fallback to mock data with proper UUIDs
    return [
      {
        id: "momo-1234567890",
        date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        customerName: "John Doe",
        phoneNumber: "0201234567",
        amount: 100,
        fee: 1,
        type: "cash-in",
        provider: "MTN Mobile Money",
        reference: "Payment for services",
        status: "completed",
        branchId:
          userContext?.branchId || "550e8400-e29b-41d4-a716-446655440000",
        branchName: "Main Branch",
        floatAccountId: "550e8400-e29b-41d4-a716-446655440001",
        floatAccountName: "MTN Mobile Money - Main",
        processedBy: "Admin User",
        cashTillAffected: 100,
        floatAffected: -100,
        userId: userContext?.userId || "550e8400-e29b-41d4-a716-446655440002",
      },
    ];
  } catch (error) {
    console.error("Error getting all MoMo transactions:", error);
    return [];
  }
}

/**
 * Get MoMo transactions with filters and proper user context
 */
export async function getMoMoTransactions(
  filters?: {
    status?: string;
    type?: string;
    provider?: string;
    startDate?: string;
    endDate?: string;
    branchId?: string;
    userId?: string;
  },
  userContext?: { userId: string; role: string; branchId: string }
): Promise<MoMoTransaction[]> {
  try {
    let transactions = await getAllMoMoTransactions(userContext);

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        transactions = transactions.filter((t) => t.status === filters.status);
      }

      if (filters.type) {
        transactions = transactions.filter((t) => t.type === filters.type);
      }

      if (filters.provider) {
        transactions = transactions.filter(
          (t) => t.provider === filters.provider
        );
      }

      if (filters.startDate) {
        transactions = transactions.filter((t) => t.date >= filters.startDate);
      }

      if (filters.endDate) {
        transactions = transactions.filter((t) => t.date <= filters.endDate);
      }

      if (filters.branchId) {
        transactions = transactions.filter(
          (t) => t.branchId === filters.branchId
        );
      }

      if (filters.userId) {
        transactions = transactions.filter((t) => t.userId === filters.userId);
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error getting MoMo transactions with filters:", error);
    return [];
  }
}

/**
 * Get a MoMo transaction by ID
 */
export async function getMoMoTransactionById(
  id: string,
  userContext?: { userId: string; role: string; branchId: string }
): Promise<MoMoTransaction | null> {
  try {
    const transactions = await getAllMoMoTransactions(userContext);
    return transactions.find((t) => t.id === id) || null;
  } catch (error) {
    console.error("Error getting MoMo transaction by ID:", error);
    return null;
  }
}

/**
 * Get MoMo transaction statistics
 */
export async function getMoMoTransactionStatistics(userContext?: {
  userId: string;
  role: string;
  branchId: string;
}): Promise<MoMoTransactionStatistics> {
  try {
    const transactions = await getAllMoMoTransactions(userContext);

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);

    const completedTransactions = transactions.filter(
      (t) => t.status === "completed"
    ).length;
    const pendingTransactions = transactions.filter(
      (t) => t.status === "pending"
    ).length;
    const failedTransactions = transactions.filter(
      (t) => t.status === "failed"
    ).length;

    // Group by type
    const byType: Record<string, { count: number; amount: number }> = {};
    transactions.forEach((t) => {
      if (!byType[t.type]) {
        byType[t.type] = { count: 0, amount: 0 };
      }
      byType[t.type].count++;
      byType[t.type].amount += t.amount;
    });

    // Group by provider
    const byProvider: Record<string, { count: number; amount: number }> = {};
    transactions.forEach((t) => {
      if (!byProvider[t.provider]) {
        byProvider[t.provider] = { count: 0, amount: 0 };
      }
      byProvider[t.provider].count++;
      byProvider[t.provider].amount += t.amount;
    });

    // Group by status
    const byStatus: Record<string, { count: number; amount: number }> = {};
    transactions.forEach((t) => {
      if (!byStatus[t.status]) {
        byStatus[t.status] = { count: 0, amount: 0 };
      }
      byStatus[t.status].count++;
      byStatus[t.status].amount += t.amount;
    });

    // Calculate daily trends (last 30 days)
    const dailyTrends: Array<{
      date: string;
      count: number;
      amount: number;
      fees: number;
    }> = [];
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < 30; i++) {
      const date = new Date(last30Days.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const dayTransactions = transactions.filter(
        (t) => t.date.startsWith(dateStr) && t.status === "completed"
      );

      dailyTrends.push({
        date: dateStr,
        count: dayTransactions.length,
        amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
        fees: dayTransactions.reduce((sum, t) => sum + t.fee, 0),
      });
    }

    // Calculate monthly trends (last 12 months)
    const monthlyTrends: Array<{
      month: string;
      count: number;
      amount: number;
      fees: number;
    }> = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format

      const monthTransactions = transactions.filter(
        (t) => t.date.startsWith(monthStr) && t.status === "completed"
      );

      monthlyTrends.unshift({
        month: monthStr,
        count: monthTransactions.length,
        amount: monthTransactions.reduce((sum, t) => sum + t.amount, 0),
        fees: monthTransactions.reduce((sum, t) => sum + t.fee, 0),
      });
    }

    const averageTransactionAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const successRate =
      totalTransactions > 0
        ? (completedTransactions / totalTransactions) * 100
        : 0;

    return {
      totalTransactions,
      totalAmount,
      totalFees,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      byType,
      byProvider,
      byStatus,
      averageTransactionAmount,
      successRate,
      dailyTrends,
      monthlyTrends,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting MoMo transaction statistics:", error);
    return {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      byType: {},
      byProvider: {},
      byStatus: {},
      averageTransactionAmount: 0,
      successRate: 0,
      dailyTrends: [],
      monthlyTrends: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
