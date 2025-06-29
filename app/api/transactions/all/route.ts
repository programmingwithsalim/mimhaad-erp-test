import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

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
    const { searchParams } = request.nextUrl;
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const branchId = searchParams.get("branchId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    console.log("📊 Fetching all transactions with filters:", {
      page,
      limit,
      branchId,
      dateFrom,
      dateTo,
      type,
      status,
    });

    const offset = (page - 1) * limit;

    // Build WHERE conditions for each table
    const buildWhereClause = (tablePrefix: string) => {
      const conditions = [];
      const params = [];

      if (branchId && branchId !== "all") {
        conditions.push(`${tablePrefix}.branch_id = $1`);
        params.push(branchId);
      }

      if (dateFrom) {
        conditions.push(`${tablePrefix}.date >= $2`);
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push(`${tablePrefix}.date <= $3`);
        params.push(dateTo);
      }

      if (type && type !== "all") {
        conditions.push(`${tablePrefix}.type = $4`);
        params.push(type);
      }

      if (status && status !== "all") {
        conditions.push(`${tablePrefix}.status = $5`);
        params.push(status);
      }

      return {
        whereClause:
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
        params,
      };
    };

    // Get transactions from all tables
    const allTransactions = [];

    // MoMo Transactions
    try {
      const momoWhere = buildWhereClause("mt");
      const momoQuery = `
        SELECT 
          mt.id,
          mt.type,
          mt.amount,
          mt.fee,
          mt.customer_name,
          mt.provider,
          mt.status,
          mt.date,
          mt.branch_id,
          mt.user_id,
          'momo' as source_module,
          b.name as branch_name
        FROM momo_transactions mt
        LEFT JOIN branches b ON mt.branch_id = b.id
        ${momoWhere.whereClause}
        ORDER BY mt.date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const momoTransactions = await sql.unsafe(momoQuery, momoWhere.params);
      allTransactions.push(
        ...momoTransactions.map((t: any) => ({ ...t, source_module: "momo" }))
      );
    } catch (error) {
      console.warn("Error fetching MoMo transactions:", error);
    }

    // Agency Banking Transactions
    try {
      const agencyWhere = buildWhereClause("abt");
      const agencyQuery = `
        SELECT 
          abt.id,
          abt.type,
          abt.amount,
          abt.fee,
          abt.customer_name,
          abt.partner_bank as provider,
          abt.status,
          abt.date,
          abt.branch_id,
          abt.user_id,
          'agency_banking' as source_module,
          b.name as branch_name
        FROM agency_banking_transactions abt
        LEFT JOIN branches b ON abt.branch_id = b.id
        ${agencyWhere.whereClause}
        ORDER BY abt.date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const agencyTransactions = await sql.unsafe(
        agencyQuery,
        agencyWhere.params
      );
      allTransactions.push(
        ...agencyTransactions.map((t: any) => ({
          ...t,
          source_module: "agency_banking",
        }))
      );
    } catch (error) {
      console.warn("Error fetching Agency Banking transactions:", error);
    }

    // E-Zwich Transactions
    try {
      const ezwichWhere = buildWhereClause("et");
      const ezwichQuery = `
        SELECT 
          et.id,
          et.transaction_type as type,
          et.transaction_amount as amount,
          et.fee_amount as fee,
          et.customer_name,
          'E-Zwich' as provider,
          et.status,
          et.transaction_date as date,
          et.branch_id,
          et.processed_by as user_id,
          'ezwich' as source_module,
          b.name as branch_name
        FROM ezwich_transactions et
        LEFT JOIN branches b ON et.branch_id = b.id
        ${ezwichWhere.whereClause}
        ORDER BY et.transaction_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const ezwichTransactions = await sql.unsafe(
        ezwichQuery,
        ezwichWhere.params
      );
      allTransactions.push(
        ...ezwichTransactions.map((t: any) => ({
          ...t,
          source_module: "ezwich",
        }))
      );
    } catch (error) {
      console.warn("Error fetching E-Zwich transactions:", error);
    }

    // Power Transactions
    try {
      const powerWhere = buildWhereClause("pt");
      const powerQuery = `
        SELECT 
          pt.id,
          pt.type,
          pt.amount,
          pt.commission as fee,
          pt.customer_name,
          pt.provider,
          pt.status,
          pt.created_at as date,
          pt.branch_id,
          pt.user_id,
          'power' as source_module,
          b.name as branch_name
        FROM power_transactions pt
        LEFT JOIN branches b ON pt.branch_id = b.id
        ${powerWhere.whereClause}
        ORDER BY pt.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const powerTransactions = await sql.unsafe(powerQuery, powerWhere.params);
      allTransactions.push(
        ...powerTransactions.map((t: any) => ({ ...t, source_module: "power" }))
      );
    } catch (error) {
      console.warn("Error fetching Power transactions:", error);
    }

    // Sort all transactions by date (most recent first)
    allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply pagination to the combined results
    const paginatedTransactions = allTransactions.slice(offset, offset + limit);

    console.log("✅ All transactions fetched successfully");

    return NextResponse.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
      pagination: {
          page,
        limit,
          total: allTransactions.length,
          totalPages: Math.ceil(allTransactions.length / limit),
      },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching all transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function getAllTransactions(
  filters: TransactionFilters,
  branchFilter: string | null,
  limit: number,
  offset: number
) {
  const transactions: any[] = [];

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
  ];

  for (const service of services) {
    try {
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${service.table}
        )
      `;

      if (!tableExists[0]?.exists) {
        console.log(`Table ${service.table} does not exist, skipping...`);
        continue;
      }

      // Skip if filtering by service and this isn't the selected service
      if (filters.service && filters.service !== service.serviceKey) {
        continue;
      }

      // Get table columns to build dynamic query
      const columns = await getTableColumns(service.table);
      console.log(`Columns for ${service.table}:`, columns);

      // Build dynamic SELECT clause based on available columns
      const selectClause = `
        id,
        ${
          columns.includes("customer_name")
            ? "customer_name"
            : "'Unknown' as customer_name"
        },
        ${
          columns.includes("phone_number")
            ? "phone_number"
            : "'' as phone_number"
        },
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
        ${
          columns.includes("created_at") ? "created_at" : "NOW() as created_at"
        },
        ${columns.includes("branch_id") ? "branch_id" : "'' as branch_id"},
        ${
          columns.includes("processed_by")
            ? "processed_by"
            : "'' as processed_by"
        }
      `;

      // Use sql.query for dynamic queries
      let query = `
        SELECT ${selectClause}
        FROM ${service.table}
      `;

      const params: any[] = [];
      const conditions: string[] = [];

      // Branch filter
      if (branchFilter && columns.includes("branch_id")) {
        conditions.push(`branch_id = $${params.length + 1}`);
        params.push(branchFilter);
      }

      // Search filter - only add if columns exist
      if (filters.search) {
        const searchConditions: string[] = [];
        if (columns.includes("customer_name")) {
          searchConditions.push(`customer_name ILIKE $${params.length + 1}`);
          params.push(`%${filters.search}%`);
        }
        if (columns.includes("phone_number")) {
          // Only add this condition if we already added the parameter for customer_name
          if (searchConditions.length > 0) {
            searchConditions.push(`phone_number ILIKE $${params.length}`);
          } else {
            searchConditions.push(`phone_number ILIKE $${params.length + 1}`);
            params.push(`%${filters.search}%`);
          }
        }
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(" OR ")})`);
        }
      }

      // Status filter
      if (filters.status && columns.includes("status")) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      // Type filter
      if (filters.type && columns.includes("type")) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      // Date range filter
      if (filters.dateFrom && columns.includes("created_at")) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(filters.dateFrom);
      }

      if (filters.dateTo && columns.includes("created_at")) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(`${filters.dateTo} 23:59:59`);
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      // Add ORDER BY and LIMIT
      query += ` ORDER BY ${
        columns.includes("created_at") ? "created_at" : "id"
      } DESC LIMIT 1000`;

      console.log(`Executing query for ${service.table}:`, query, params);

      // Execute the query
      const result = await sql.query(query, params);

      // Handle different result structures
      let rows: any[] = [];
      if (result && Array.isArray(result)) {
        rows = result;
      } else if (result && result.rows && Array.isArray(result.rows)) {
        rows = result.rows;
      } else if (result && result.length !== undefined) {
        rows = Array.from(result);
      }

      console.log(`Found ${rows.length} transactions in ${service.table}`);

      // Add service type and ensure numeric values
      const serviceTransactions = rows.map((tx: any) => ({
        ...tx,
        service_type: service.name,
        amount: Number(tx.amount || 0),
        fee: Number(tx.fee || 0),
        created_at: tx.created_at || new Date().toISOString(),
      }));

      transactions.push(...serviceTransactions);
    } catch (error) {
      console.error(
        `Error fetching transactions from ${service.table}:`,
        error
      );
      // Continue with other services even if one fails
    }
  }

  // Sort all transactions by created_at and apply pagination
  const sortedTransactions = transactions
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(offset, offset + limit);

  console.log(
    `Returning ${sortedTransactions.length} transactions out of ${transactions.length} total`
  );

  return sortedTransactions;
}

async function getTotalTransactionCount(
  filters: TransactionFilters,
  branchFilter: string | null
): Promise<number> {
  let totalCount = 0;

  const services = [
    { table: "momo_transactions", serviceKey: "momo" },
    { table: "agency_banking_transactions", serviceKey: "agency-banking" },
    { table: "e_zwich_transactions", serviceKey: "e-zwich" },
    { table: "power_transactions", serviceKey: "power" },
    { table: "jumia_transactions", serviceKey: "jumia" },
  ];

  for (const service of services) {
    try {
      // Skip if filtering by service and this isn't the selected service
      if (filters.service && filters.service !== service.serviceKey) {
        continue;
      }

      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${service.table}
        )
      `;

      if (!tableExists[0]?.exists) continue;

      const columns = await getTableColumns(service.table);

      let query = `SELECT COUNT(*) as count FROM ${service.table}`;
      const params: any[] = [];
      const conditions: string[] = [];

      // Branch filter
      if (branchFilter && columns.includes("branch_id")) {
        conditions.push(`branch_id = $${params.length + 1}`);
        params.push(branchFilter);
      }

      // Search filter - only add if columns exist
      if (filters.search) {
        const searchConditions: string[] = [];
        if (columns.includes("customer_name")) {
          searchConditions.push(`customer_name ILIKE $${params.length + 1}`);
          params.push(`%${filters.search}%`);
        }
        if (columns.includes("phone_number")) {
          // Only add this condition if we already added the parameter for customer_name
          if (searchConditions.length > 0) {
            searchConditions.push(`phone_number ILIKE $${params.length}`);
          } else {
            searchConditions.push(`phone_number ILIKE $${params.length + 1}`);
            params.push(`%${filters.search}%`);
          }
        }
        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(" OR ")})`);
        }
      }

      // Status filter
      if (filters.status && columns.includes("status")) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      // Type filter
      if (filters.type && columns.includes("type")) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      // Date range filter
      if (filters.dateFrom && columns.includes("created_at")) {
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(filters.dateFrom);
      }

      if (filters.dateTo && columns.includes("created_at")) {
        conditions.push(`created_at <= $${params.length + 1}`);
        params.push(`${filters.dateTo} 23:59:59`);
      }

      // Add WHERE clause if we have conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      console.log(`Executing count query for ${service.table}:`, query, params);

      const result = await sql.query(query, params);

      // Handle different result structures safely
      let count = 0;
      if (result && Array.isArray(result) && result.length > 0) {
        count = Number(result[0]?.count || 0);
      } else if (
        result &&
        result.rows &&
        Array.isArray(result.rows) &&
        result.rows.length > 0
      ) {
        count = Number(result.rows[0]?.count || 0);
      } else if (result && result.length !== undefined && result.length > 0) {
        const firstRow = Array.from(result)[0] as any;
        count = Number(firstRow?.count || 0);
      }

      console.log(`Count for ${service.table}:`, count);
      totalCount += count;
    } catch (error) {
      console.error(
        `Error counting transactions from ${service.table}:`,
        error
      );
    }
  }

  return totalCount;
}

async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
    `;
    return result.map((row: any) => row.column_name);
  } catch (error) {
    console.error(`Error checking columns for ${tableName}:`, error);
    return [];
  }
}
