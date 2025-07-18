import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";
import { FloatAccountService } from "@/lib/services/float-account-service";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Debug: log cookies and headers
    console.log(
      "[DEBUG] Request cookies:",
      request.cookies?.getAll?.() || request.cookies
    );
    console.log(
      "[DEBUG] Request headers:",
      Object.fromEntries(request.headers?.entries?.() || [])
    );
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const isEzwichPartner = searchParams.get("isEzwichPartner");
    const showInactive = searchParams.get("showInactive") === "true";
    const accountType = searchParams.get("accountType");
    const provider = searchParams.get("provider");
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam === "true"
        ? true
        : isActiveParam === "false"
        ? false
        : undefined;

    console.log("💰 [FLOAT] Fetching float accounts with params:", {
      branchId,
      isEzwichPartner,
      showInactive,
    });

    // Get current user for role-based access
    let user;
    try {
      user = await getCurrentUser(request);
      console.log("[DEBUG] getCurrentUser result:", user);
    } catch (authError) {
      console.warn("Authentication failed, using fallback:", authError);
      user = {
        id: "00000000-0000-0000-0000-000000000000",
        name: "System User",
        username: "system",
        role: "User",
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        branchName: "Main Branch",
      };
    }

    const isAdmin = user.role === "Admin" || user.role === "admin";
    const userBranchId = user.branchId;

    console.log("💰 [FLOAT] User context:", {
      userId: user.id,
      userRole: user.role,
      isAdmin,
      userBranchId,
    });

    // Build dynamic WHERE clauses using template literals for safety
    let whereConditions: string[] = [];

    if (branchId && branchId !== "undefined") {
      whereConditions.push(`fa.branch_id = '${branchId}'`);
    } else if (!isAdmin) {
      whereConditions.push(`fa.branch_id = '${userBranchId}'`);
    }

    if (isEzwichPartner === "true") {
      // Check if isezwichpartner column exists before using it
      try {
        const columnCheck = await sql`
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'float_accounts' 
            AND column_name = 'isezwichpartner'
          ) as exists
        `;

        if (columnCheck[0]?.exists) {
          whereConditions.push(`fa.isezwichpartner = true`);
        } else {
          // If column doesn't exist, filter by account_type instead
          whereConditions.push(`fa.account_type = 'e-zwich'`);
        }
      } catch (error) {
        console.warn(
          "Could not check isezwichpartner column, using account_type filter:",
          error
        );
        whereConditions.push(`fa.account_type = 'e-zwich'`);
      }
    }

    if (accountType) {
      whereConditions.push(`fa.account_type = '${accountType}'`);
    }

    if (provider) {
      whereConditions.push(`fa.provider = '${provider}'`);
    }

    if (typeof isActive === "boolean") {
      whereConditions.push(`fa.is_active = ${isActive}`);
    } else if (!showInactive) {
      whereConditions.push(`fa.is_active = true`);
    }

    // Compose the WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT fa.*, b.name as branch_name
      FROM float_accounts fa
      LEFT JOIN branches b ON fa.branch_id = b.id
      ${whereClause}
      ORDER BY fa.is_active DESC, fa.created_at DESC
    `;

    console.log("💰 [FLOAT] Executing query:", query);

    // Use a simpler approach with proper SQL template literals
    let floatAccounts;
    try {
      if (branchId && branchId !== "undefined") {
        floatAccounts = await sql`
          SELECT fa.*, b.name as branch_name
          FROM float_accounts fa
          LEFT JOIN branches b ON fa.branch_id = b.id
          WHERE fa.branch_id = ${branchId}
          ORDER BY fa.is_active DESC, fa.created_at DESC
        `;
      } else if (!isAdmin) {
        floatAccounts = await sql`
          SELECT fa.*, b.name as branch_name
          FROM float_accounts fa
          LEFT JOIN branches b ON fa.branch_id = b.id
          WHERE fa.branch_id = ${userBranchId}
          ORDER BY fa.is_active DESC, fa.created_at DESC
        `;
      } else {
        floatAccounts = await sql`
          SELECT fa.*, b.name as branch_name
          FROM float_accounts fa
          LEFT JOIN branches b ON fa.branch_id = b.id
          ORDER BY fa.is_active DESC, fa.created_at DESC
        `;
      }
    } catch (dbError) {
      console.error("💰 [FLOAT] Database error:", dbError);
      throw dbError;
    }

    console.log(`💰 [FLOAT] Found ${floatAccounts.length} float accounts`);

    // Log first few accounts for debugging
    if (floatAccounts.length > 0) {
      console.log(
        "💰 [FLOAT] Sample accounts:",
        floatAccounts.slice(0, 2).map((acc) => ({
          id: acc.id,
          account_type: acc.account_type,
          provider: acc.provider,
          current_balance: acc.current_balance,
          branch_id: acc.branch_id,
          branch_name: acc.branch_name,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      data: floatAccounts,
      accounts: floatAccounts,
      count: floatAccounts.length,
      debug: {
        userRole: user.role,
        isAdmin,
        userBranchId,
        requestedBranchId: branchId,
        filters: {
          isEzwichPartner,
          showInactive,
          accountType,
          provider,
          isActive,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching float accounts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch float accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider,
      account_type,
      account_number,
      current_balance,
      min_threshold,
      max_threshold,
      is_active = true,
      isEzwichPartner = false,
      notes,
      branch_id,
    } = body;

    console.log(
      "💰 [FLOAT] Creating float account with data:",
      JSON.stringify(body, null, 2)
    );

    // Get current user for role-based access
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      console.warn("Authentication failed, using fallback:", authError);
      user = {
        id: "00000000-0000-0000-0000-000000000000",
        name: "System User",
        username: "system",
        role: "User",
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        branchName: "Main Branch",
      };
    }

    // Validate required fields
    if (!provider || !account_type || !branch_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: provider, account_type, branch_id",
        },
        { status: 400 }
      );
    }

    // Check if user has permission to create account for this branch
    const isAdmin = user.role === "Admin" || user.role === "admin";
    if (!isAdmin && branch_id !== user.branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only create float accounts for your own branch",
        },
        { status: 403 }
      );
    }

    console.log("💰 [FLOAT] Using user ID:", user.id);

    // Use FloatAccountService for creation (auto GL)
    const floatAccount = await FloatAccountService.createFloatAccount({
      branch_id,
      account_type,
      provider,
      account_number: account_number || provider || account_type,
      initial_balance: current_balance || 0,
    });

    return NextResponse.json({
      success: true,
      account: floatAccount,
      message: "Float account created successfully (with GL)",
    });
  } catch (error) {
    console.error("❌ [FLOAT] Error creating float account:", error);

    // Handle unique constraint violations for float account types per branch
    const uniqueConstraintMessage =
      "A float account of this type already exists for this branch.";
    if (
      error &&
      typeof error === "object" &&
      (error.code === "23505" ||
        (error.message &&
          (error.message.includes("unique_cash_in_till_per_branch") ||
            error.message.includes("unique_jumia_per_branch") ||
            error.message.includes("unique_power_per_branch"))))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: uniqueConstraintMessage,
        },
        { status: 400 }
      );
    }

    // Fallback: check error message for unique/exists
    if (
      error instanceof Error &&
      /unique|already exists|duplicate/i.test(error.message)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: uniqueConstraintMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create float account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
