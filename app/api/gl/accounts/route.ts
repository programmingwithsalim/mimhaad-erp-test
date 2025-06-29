import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get("active");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let query = `
      SELECT 
        id,
        code as account_code,
        name as account_name,
        type as account_type,
        COALESCE(balance, 0) as balance,
        is_active
      FROM gl_accounts
      WHERE 1=1
    `;

    const params: any[] = [];

    if (active === "true") {
      query += ` AND is_active = true`;
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (search) {
      query += ` AND (code ILIKE $${params.length + 1} OR name ILIKE $${
        params.length + 1
      })`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY code ASC`;

    const accounts = await sql.unsafe(query, ...params);

    return NextResponse.json({
      success: true,
      accounts: accounts.map((account) => ({
        id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        balance: Number(account.balance) || 0,
        is_active: account.is_active,
      })),
    });
  } catch (error) {
    console.error("Error fetching GL accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch GL accounts",
        details: error instanceof Error ? error.message : String(error),
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
    } = body;

    if (!account_code || !account_name || !account_type) {
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
