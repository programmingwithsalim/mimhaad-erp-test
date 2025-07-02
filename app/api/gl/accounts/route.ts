import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get("active");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    // Build the WHERE clause and parameters
    let whereParts: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    if (active === "true") {
      whereParts.push(`is_active = true`);
    }
    if (type) {
      whereParts.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    if (search) {
      whereParts.push(
        `(code ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }
    let whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const query = `
      SELECT 
        id,
        code as account_code,
        name as account_name,
        type as account_type,
        COALESCE(balance, 0) as balance,
        is_active,
        branch_id
      FROM gl_accounts
      ${whereClause}
      ORDER BY code ASC
    `;
    // Use sql.query for parameterized queries
    const accountsResult: any = await sql.query(query, params);
    const accountsArray = Array.isArray(accountsResult)
      ? accountsResult
      : accountsResult.rows
      ? accountsResult.rows
      : [];
    return NextResponse.json({
      success: true,
      accounts: accountsArray.map((account: any) => ({
        id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        balance: Number(account.balance) || 0,
        is_active: account.is_active,
        branch_id: account.branch_id,
      })),
    });
  } catch (error: unknown) {
    console.error("Error fetching GL accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch GL accounts",
        details: (error as any)?.message
          ? (error as any).message
          : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      account_code,
      account_name,
      account_type,
      parent_id,
      description,
      is_active = true,
      branch_id,
    } = body;

    if (!account_code || !account_name || !account_type || !branch_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if account code already exists
    const existing = await sql`
      SELECT id FROM gl_accounts WHERE code = ${account_code}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Account code already exists" },
        { status: 400 }
      );
    }

    // Create new account with UUID generation
    const result = await sql`
      INSERT INTO gl_accounts (
        id,
        code, 
        name, 
        type, 
        parent_id, 
        is_active, 
        balance,
        branch_id,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${account_code}, 
        ${account_name}, 
        ${account_type}, 
        ${parent_id || null}, 
        ${is_active}, 
        0,
        ${branch_id},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "GL account created successfully",
    });
  } catch (error) {
    console.error("Error creating GL account:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create GL account",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
