import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getDatabaseSession } from "@/lib/database-session-service";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const session = await getDatabaseSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    // Build the main query using GL system with simple template literals
    let transactions: any[] = [];

    // First, get the transaction types for this float account
    const mappingResult = await sql`
      SELECT DISTINCT transaction_type 
      FROM gl_mappings 
      WHERE float_account_id = ${accountId}::uuid
    `;

    const allowedTransactionTypes = mappingResult.map(
      (m: any) => m.transaction_type
    );

    if (allowedTransactionTypes.length === 0) {
      // No mappings found for this float account - use fallback approach
      console.log(`No GL mappings found for float account ${accountId}`);

      // Get the float account details to understand what type it is
      const floatAccountDetails = await sql`
        SELECT account_type, branch_id, provider
        FROM float_accounts 
        WHERE id = ${accountId}::uuid
      `;

      if (floatAccountDetails.length === 0) {
        console.log(`Float account ${accountId} not found`);
        transactions = [];
      } else {
        const accountType = floatAccountDetails[0].account_type;
        console.log(`Float account type: ${accountType}`);

        // For now, let's get all transactions and filter by account type logic
        // This is a fallback approach when GL mappings are not set up
        if (
          type &&
          startDate &&
          endDate &&
          session.user.role !== "Admin" &&
          session.user.branchId
        ) {
          // All conditions
          const allTransactions = await sql`
            SELECT 
              gt.id,
              gt.date as transaction_date,
              gt.source_module,
              gt.source_transaction_type as type,
              gt.source_transaction_id as reference_id,
              gt.amount,
              gt.description,
              gt.status,
              gt.reference,
              gt.created_at,
              gt.branch_id,
              gt.branch_name,
              'fallback' as mapping_type,
              ${accountType} as float_account_type,
              ${
                floatAccountDetails[0].provider || "system"
              } as float_account_provider,
              'N/A' as float_account_number,
              u.first_name || ' ' || u.last_name as created_by_name
            FROM gl_transactions gt
            LEFT JOIN users u ON gt.created_by = u.id
            WHERE gt.source_transaction_type = ${type}
            AND gt.date >= ${startDate}
            AND gt.date <= ${endDate}
            AND gt.branch_id = ${session.user.branchId}::uuid
            ORDER BY gt.date DESC, gt.created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
          `;
          transactions = allTransactions;
        } else if (startDate && endDate) {
          // Basic date range query
          if (session.user.role !== "Admin" && session.user.branchId) {
            // With branch filter
            const allTransactions = await sql`
              SELECT 
                gt.id,
                gt.date as transaction_date,
                gt.source_module,
                gt.source_transaction_type as type,
                gt.source_transaction_id as reference_id,
                gt.amount,
                gt.description,
                gt.status,
                gt.reference,
                gt.created_at,
                gt.branch_id,
                gt.branch_name,
                'fallback' as mapping_type,
                ${accountType} as float_account_type,
                ${floatAccountDetails[0].provider || "system"} as float_account_provider,
                'N/A' as float_account_number,
                u.first_name || ' ' || u.last_name as created_by_name
              FROM gl_transactions gt
              LEFT JOIN users u ON gt.created_by = u.id
              WHERE gt.date >= ${startDate}
              AND gt.date <= ${endDate}
              AND gt.branch_id = ${session.user.branchId}::uuid
              ORDER BY gt.date DESC, gt.created_at DESC 
              LIMIT ${limit} OFFSET ${offset}
            `;
            transactions = allTransactions;
          } else {
            // Without branch filter
            const allTransactions = await sql`
              SELECT 
                gt.id,
                gt.date as transaction_date,
                gt.source_module,
                gt.source_transaction_type as type,
                gt.source_transaction_id as reference_id,
                gt.amount,
                gt.description,
                gt.status,
                gt.reference,
                gt.created_at,
                gt.branch_id,
                gt.branch_name,
                'fallback' as mapping_type,
                ${accountType} as float_account_type,
                ${floatAccountDetails[0].provider || "system"} as float_account_provider,
                'N/A' as float_account_number,
                u.first_name || ' ' || u.last_name as created_by_name
              FROM gl_transactions gt
              LEFT JOIN users u ON gt.created_by = u.id
              WHERE gt.date >= ${startDate}
              AND gt.date <= ${endDate}
              ORDER BY gt.date DESC, gt.created_at DESC 
              LIMIT ${limit} OFFSET ${offset}
            `;
            transactions = allTransactions;
          }
        } else {
          // Basic query
          if (session.user.role !== "Admin" && session.user.branchId) {
            // With branch filter
            const allTransactions = await sql`
              SELECT 
                gt.id,
                gt.date as transaction_date,
                gt.source_module,
                gt.source_transaction_type as type,
                gt.source_transaction_id as reference_id,
                gt.amount,
                gt.description,
                gt.status,
                gt.reference,
                gt.created_at,
                gt.branch_id,
                gt.branch_name,
                'fallback' as mapping_type,
                ${accountType} as float_account_type,
                ${floatAccountDetails[0].provider || "system"} as float_account_provider,
                'N/A' as float_account_number,
                u.first_name || ' ' || u.last_name as created_by_name
              FROM gl_transactions gt
              LEFT JOIN users u ON gt.created_by = u.id
              WHERE gt.branch_id = ${session.user.branchId}::uuid
              ORDER BY gt.date DESC, gt.created_at DESC 
              LIMIT ${limit} OFFSET ${offset}
            `;
            transactions = allTransactions;
          } else {
            // Without branch filter
            const allTransactions = await sql`
              SELECT 
                gt.id,
                gt.date as transaction_date,
                gt.source_module,
                gt.source_transaction_type as type,
                gt.source_transaction_id as reference_id,
                gt.amount,
                gt.description,
                gt.status,
                gt.reference,
                gt.created_at,
                gt.branch_id,
                gt.branch_name,
                'fallback' as mapping_type,
                ${accountType} as float_account_type,
                ${floatAccountDetails[0].provider || "system"} as float_account_provider,
                'N/A' as float_account_number,
                u.first_name || ' ' || u.last_name as created_by_name
              FROM gl_transactions gt
              LEFT JOIN users u ON gt.created_by = u.id
              ORDER BY gt.date DESC, gt.created_at DESC 
              LIMIT ${limit} OFFSET ${offset}
            `;
            transactions = allTransactions;
          }
        }
      }
    } else {
      // Use a simple approach with basic template literals
      // Get all transactions first, then filter by allowed types
      if (
        type &&
        startDate &&
        endDate &&
        session.user.role !== "Admin" &&
        session.user.branchId
      ) {
        // All conditions
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.source_transaction_type = ${type}
          AND gt.date >= ${startDate}
          AND gt.date <= ${endDate}
          AND gt.branch_id = ${session.user.branchId}::uuid
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (type && startDate && endDate) {
        // Type, startDate, endDate
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.source_transaction_type = ${type}
          AND gt.date >= ${startDate}
          AND gt.date <= ${endDate}
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (
        startDate &&
        endDate &&
        session.user.role !== "Admin" &&
        session.user.branchId
      ) {
        // startDate, endDate, with branch filter
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.date >= ${startDate}
          AND gt.date <= ${endDate}
          AND gt.branch_id = ${session.user.branchId}::uuid
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (startDate && endDate) {
        // startDate, endDate (Admin or no branch filter needed)
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.date >= ${startDate}
          AND gt.date <= ${endDate}
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (
        type &&
        session.user.role !== "Admin" &&
        session.user.branchId
      ) {
        // Type only with branch filter
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.source_transaction_type = ${type}
          AND gt.branch_id = ${session.user.branchId}::uuid
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (type) {
        // Type only
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.source_transaction_type = ${type}
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else if (session.user.role !== "Admin" && session.user.branchId) {
        // Basic query with branch filter
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          WHERE gt.branch_id = ${session.user.branchId}::uuid
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      } else {
        // Basic query - no filters
        const allTransactions = await sql`
          SELECT 
            gt.id,
            gt.date as transaction_date,
            gt.source_module,
            gt.source_transaction_type as type,
            gt.source_transaction_id as reference_id,
            gt.amount,
            gt.description,
            gt.status,
            gt.reference,
            gt.created_at,
            gt.branch_id,
            gt.branch_name,
            'main' as mapping_type,
            'float' as float_account_type,
            'system' as float_account_provider,
            'N/A' as float_account_number,
            u.first_name || ' ' || u.last_name as created_by_name
          FROM gl_transactions gt
          LEFT JOIN users u ON gt.created_by = u.id
          ORDER BY gt.date DESC, gt.created_at DESC 
          LIMIT ${limit} OFFSET ${offset}
        `;
        transactions = allTransactions.filter((t: any) =>
          allowedTransactionTypes.includes(t.type)
        );
      }
    }

    // Get total count for pagination using the same conditional logic
    let countResult;

    if (
      type &&
      startDate &&
      endDate &&
      session.user.role !== "Admin" &&
      session.user.branchId
    ) {
      // All conditions
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.source_transaction_type = ${type}
        AND gt.date >= ${startDate}
        AND gt.date <= ${endDate}
        AND gt.branch_id = ${session.user.branchId}::uuid
      `;
    } else if (type && startDate && endDate) {
      // Type, startDate, endDate
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.source_transaction_type = ${type}
        AND gt.date >= ${startDate}
        AND gt.date <= ${endDate}
      `;
    } else if (
      startDate &&
      endDate &&
      session.user.role !== "Admin" &&
      session.user.branchId
    ) {
      // startDate, endDate, with branch filter
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.date >= ${startDate}
        AND gt.date <= ${endDate}
        AND gt.branch_id = ${session.user.branchId}::uuid
      `;
    } else if (startDate && endDate) {
      // startDate, endDate (Admin or no branch filter needed)
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.date >= ${startDate}
        AND gt.date <= ${endDate}
      `;
    } else if (type && session.user.role !== "Admin" && session.user.branchId) {
      // Type only with branch filter
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.source_transaction_type = ${type}
        AND gt.branch_id = ${session.user.branchId}::uuid
      `;
    } else if (type) {
      // Type only
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.source_transaction_type = ${type}
      `;
    } else if (session.user.role !== "Admin" && session.user.branchId) {
      // Basic query with branch filter
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
        AND gt.branch_id = ${session.user.branchId}::uuid
      `;
    } else {
      // Basic query - only accountId
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM gl_transactions gt
        WHERE gt.source_transaction_type IN (
          SELECT DISTINCT transaction_type 
          FROM gl_mappings 
          WHERE float_account_id = ${accountId}::uuid
        )
      `;
    }
    const total = countResult[0]?.total || 0;

    // Get float account details
    const floatAccountDetails = await sql`
      SELECT 
        id,
        account_type,
        provider,
        account_number,
        current_balance,
        account_name
      FROM float_accounts 
      WHERE id = ${accountId}
    `;

    return NextResponse.json({
      success: true,
      data: {
        floatAccount: floatAccountDetails[0] || null,
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching float transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transaction history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
