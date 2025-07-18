import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { z } from "zod";

// Input validation schema
const TransactionQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1).default(1)),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100).default(50)),
  search: z.string().optional(),
  service: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  branchId: z.string().optional(),
});

interface TransactionFilters {
  search?: string;
  service?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Parse filters
    const filters: TransactionFilters = {
      search: searchParams.get("search") || undefined,
      service: searchParams.get("service") || undefined,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      branchId: searchParams.get("branchId") || undefined,
    };

    // Get current user with better error handling
    let user;
    let effectiveBranchId = null;

    try {
      user = await getCurrentUser(request); // Ensure this is awaited if async
      if (!user) throw new Error("No user found");
      console.log("👤 Current user:", user);

      if (user.role === "Admin") {
        effectiveBranchId = filters.branchId || "all";
      } else {
        effectiveBranchId = user.branchId;
      }
    } catch (authError) {
      // Instead of fallback admin, return 401
      console.warn("⚠️ Authentication failed:", authError);
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("📊 Fetching transactions with optimized query:", {
      page,
      limit,
      filters,
      userRole: user.role,
      effectiveBranchId,
    });

    // Execute queries using template literals
    let transactionsResult = [];
    let totalCount = 0;

    try {
      console.log("🔍 Executing individual table queries...");

      // Query each table individually with hardcoded queries

      // 1. MoMo Transactions
      try {
        let momoCount, momoData;
        if (effectiveBranchId && effectiveBranchId !== "all") {
          momoCount =
            await sql`SELECT COUNT(*) as count FROM momo_transactions WHERE branch_id::text = ${effectiveBranchId}`;
          if (momoCount[0]?.count > 0) {
            momoData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, phone_number, 
                provider, status, created_at as date, branch_id, user_id, reference
              FROM momo_transactions 
              WHERE branch_id::text = ${effectiveBranchId}
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        } else {
          momoCount =
            await sql`SELECT COUNT(*) as count FROM momo_transactions`;
          if (momoCount[0]?.count > 0) {
            momoData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, phone_number, 
                provider, status, created_at as date, branch_id, user_id, reference
              FROM momo_transactions 
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        }

        const momoCountNum = Number.parseInt(momoCount[0]?.count || "0");
        totalCount += momoCountNum;
        if (momoData) {
          transactionsResult.push(
            ...momoData.map((tx: any) => ({ ...tx, source_module: "momo" }))
          );
        }
        console.log(`📊 MoMo transactions: ${momoCountNum}`);
      } catch (error) {
        console.warn("⚠️ MoMo transactions query failed:", error);
      }

      // 2. Agency Banking Transactions
      try {
        let agencyCount, agencyData;
        if (effectiveBranchId && effectiveBranchId !== "all") {
          agencyCount =
            await sql`SELECT COUNT(*) as count FROM agency_banking_transactions WHERE branch_id::text = ${effectiveBranchId}`;
          if (agencyCount[0]?.count > 0) {
            agencyData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, account_number as phone_number, 
                partner_bank as provider, status, date, branch_id, user_id, reference
              FROM agency_banking_transactions 
              WHERE branch_id::text = ${effectiveBranchId}
              ORDER BY date DESC 
              LIMIT ${limit}
            `;
          }
        } else {
          agencyCount =
            await sql`SELECT COUNT(*) as count FROM agency_banking_transactions`;
          if (agencyCount[0]?.count > 0) {
            agencyData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, account_number as phone_number, 
                partner_bank as provider, status, date, branch_id, user_id, reference
              FROM agency_banking_transactions 
              ORDER BY date DESC 
              LIMIT ${limit}
            `;
          }
        }

        const agencyCountNum = Number.parseInt(agencyCount[0]?.count || "0");
        totalCount += agencyCountNum;
        if (agencyData) {
          transactionsResult.push(
            ...agencyData.map((tx: any) => ({
              ...tx,
              source_module: "agency_banking",
            }))
          );
        }
        console.log(`📊 Agency banking transactions: ${agencyCountNum}`);
      } catch (error) {
        console.warn("⚠️ Agency banking transactions query failed:", error);
      }

      // 3. E-Zwich Transactions
      try {
        let ezwichCount, ezwichData;
        if (effectiveBranchId && effectiveBranchId !== "all") {
          ezwichCount =
            await sql`SELECT COUNT(*) as count FROM ezwich_transactions WHERE branch_id::text = ${effectiveBranchId}`;
          if (ezwichCount[0]?.count > 0) {
            ezwichData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, customer_phone as phone_number, 
                partner_bank as provider, status, created_at as date, branch_id, user_id, reference
              FROM ezwich_transactions 
              WHERE branch_id::text = ${effectiveBranchId}
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        } else {
          ezwichCount =
            await sql`SELECT COUNT(*) as count FROM ezwich_transactions`;
          if (ezwichCount[0]?.count > 0) {
            ezwichData = await sql`
              SELECT 
                id, type, amount, fee, customer_name, customer_phone as phone_number, 
                partner_bank as provider, status, created_at as date, branch_id, user_id, reference
              FROM ezwich_transactions 
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        }

        const ezwichCountNum = Number.parseInt(ezwichCount[0]?.count || "0");
        totalCount += ezwichCountNum;
        if (ezwichData) {
          transactionsResult.push(
            ...ezwichData.map((tx: any) => ({ ...tx, source_module: "ezwich" }))
          );
        }
        console.log(`📊 E-Zwich transactions: ${ezwichCountNum}`);
      } catch (error) {
        console.warn("⚠️ E-Zwich transactions query failed:", error);
      }

      // 4. Power Transactions
      try {
        let powerCount, powerData;
        if (effectiveBranchId && effectiveBranchId !== "all") {
          powerCount =
            await sql`SELECT COUNT(*) as count FROM power_transactions WHERE branch_id::text = ${effectiveBranchId}`;
          if (powerCount[0]?.count > 0) {
            powerData = await sql`
              SELECT 
                id, type, amount, commission as fee, customer_name, customer_phone as phone_number, 
                provider, status, created_at as date, branch_id, user_id, reference
              FROM power_transactions 
              WHERE branch_id::text = ${effectiveBranchId}
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        } else {
          powerCount =
            await sql`SELECT COUNT(*) as count FROM power_transactions`;
          if (powerCount[0]?.count > 0) {
            powerData = await sql`
              SELECT 
                id, type, amount, commission as fee, customer_name, customer_phone as phone_number, 
                provider, status, created_at as date, branch_id, user_id, reference
              FROM power_transactions 
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        }

        const powerCountNum = Number.parseInt(powerCount[0]?.count || "0");
        totalCount += powerCountNum;
        if (powerData) {
          transactionsResult.push(
            ...powerData.map((tx: any) => ({ ...tx, source_module: "power" }))
          );
        }
        console.log(`📊 Power transactions: ${powerCountNum}`);
      } catch (error) {
        console.warn("⚠️ Power transactions query failed:", error);
      }

      // 5. Jumia Transactions
      try {
        let jumiaCount, jumiaData;
        if (effectiveBranchId && effectiveBranchId !== "all") {
          jumiaCount =
            await sql`SELECT COUNT(*) as count FROM jumia_transactions WHERE branch_id::text = ${effectiveBranchId}`;
          if (jumiaCount[0]?.count > 0) {
            jumiaData = await sql`
              SELECT 
                id, transaction_type as type, amount, fee, customer_name, customer_phone as phone_number, 
                'Jumia' as provider, status, created_at as date, branch_id, user_id, transaction_id as reference
              FROM jumia_transactions 
              WHERE branch_id::text = ${effectiveBranchId}
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        } else {
          jumiaCount =
            await sql`SELECT COUNT(*) as count FROM jumia_transactions`;
          if (jumiaCount[0]?.count > 0) {
            jumiaData = await sql`
              SELECT 
                id, transaction_type as type, amount, fee, customer_name, customer_phone as phone_number, 
                'Jumia' as provider, status, created_at as date, branch_id, user_id, transaction_id as reference
              FROM jumia_transactions 
              ORDER BY created_at DESC 
              LIMIT ${limit}
            `;
          }
        }

        const jumiaCountNum = Number.parseInt(jumiaCount[0]?.count || "0");
        totalCount += jumiaCountNum;
        if (jumiaData) {
          transactionsResult.push(
            ...jumiaData.map((tx: any) => ({ ...tx, source_module: "jumia" }))
          );
        }
        console.log(`📊 Jumia transactions: ${jumiaCountNum}`);
      } catch (error) {
        console.warn("⚠️ Jumia transactions query failed:", error);
      }

      console.log("✅ All table queries executed successfully");
      console.log("📊 Raw results:", {
        transactionsResultLength: transactionsResult.length,
        totalCount,
      });
    } catch (queryError) {
      console.error("❌ Query execution failed:", queryError);
      // Set empty results instead of throwing
      transactionsResult = [];
      totalCount = 0;
    }

    // Ensure we have arrays, even if empty
    const transactions = Array.isArray(transactionsResult)
      ? transactionsResult
      : [];
    const totalPages = Math.ceil(totalCount / limit);

    console.log("📊 Processed results:", {
      transactionsCount: transactions.length,
      totalCount,
      totalPages,
    });

    // Transform results for consistent format
    const formattedTransactions = transactions.map((tx: any) => ({
      id: tx.id,
      customer_name: tx.customer_name || "N/A",
      phone_number: tx.phone_number || "N/A",
      amount: Number(tx.amount) || 0,
      fee: Number(tx.fee) || 0,
      type: tx.type || "N/A",
      status: tx.status || "N/A",
      reference: tx.reference || "N/A",
      provider: tx.provider || "N/A",
      created_at: tx.date,
      branch_id: tx.branch_id,
      branch_name: tx.branch_name,
      processed_by: tx.user_id,
      service_type: tx.source_module,
    }));

    // Sort by created_at in descending order (latest first)
    formattedTransactions.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
