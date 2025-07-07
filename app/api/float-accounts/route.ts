import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const isEzwichPartner = searchParams.get("isEzwichPartner");
    const showInactive = searchParams.get("showInactive") === "true";

    console.log("💰 [FLOAT] Fetching float accounts with params:", {
      branchId,
      isEzwichPartner,
      showInactive,
    });

    // Get current user for role-based access
    let user;
    try {
      user = getCurrentUser(request);
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

    let floatAccounts;

    // Build query based on conditions
    if (branchId && branchId !== "undefined") {
      if (!isAdmin && branchId !== userBranchId) {
        return NextResponse.json(
          { success: false, error: "Access denied to this branch" },
          { status: 403 }
        );
      }

      if (isEzwichPartner === "true") {
        if (showInactive) {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${branchId} AND fa.isezwichpartner = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        } else {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${branchId} AND fa.isezwichpartner = true AND fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      } else {
        if (showInactive) {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${branchId}
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        } else {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${branchId} AND fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      }
    } else if (!isAdmin) {
      // Non-admin users can only see their branch
      if (isEzwichPartner === "true") {
        if (showInactive) {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${userBranchId} AND fa.isezwichpartner = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        } else {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.branch_id = ${userBranchId} AND fa.isezwichpartner = true AND fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      } else {
        if (showInactive) {
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
            WHERE fa.branch_id = ${userBranchId} AND fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      }
    } else {
      // Admin users can see all accounts
      if (isEzwichPartner === "true") {
        if (showInactive) {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.isezwichpartner = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        } else {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.isezwichpartner = true AND fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      } else {
        if (showInactive) {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        } else {
          floatAccounts = await sql`
            SELECT fa.*, b.name as branch_name 
            FROM float_accounts fa
            LEFT JOIN branches b ON fa.branch_id = b.id
            WHERE fa.is_active = true
            ORDER BY fa.is_active DESC, fa.created_at DESC
          `;
        }
      }
    }

    console.log(`💰 [FLOAT] Found ${floatAccounts.length} float accounts`);

    return NextResponse.json({
      success: true,
      data: floatAccounts,
      accounts: floatAccounts,
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
      user = getCurrentUser(request);
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

    // Create the float account
    const result = await sql`
      INSERT INTO float_accounts (
        provider,
        account_type,
        account_number,
        current_balance,
        min_threshold,
        max_threshold,
        is_active,
        isezwichpartner,
        notes,
        branch_id,
        created_by
      ) VALUES (
        ${provider},
        ${account_type},
        ${account_number || null},
        ${current_balance || 0},
        ${min_threshold || 1000},
        ${max_threshold || 50000},
        ${is_active},
        ${isEzwichPartner},
        ${notes || null},
        ${branch_id},
        ${user.id}
      )
      RETURNING *
    `;

    console.log("✅ [FLOAT] Float account created successfully:", result[0]);

    return NextResponse.json({
      success: true,
      account: result[0],
      message: "Float account created successfully",
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
