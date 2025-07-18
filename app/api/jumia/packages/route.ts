import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export interface JumiaPackage {
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_phone?: string;
  branch_id: string;
  user_id: string;
  status: "received" | "delivered" | "settled";
  received_at: string;
  delivered_at?: string;
  settled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// GET - Get packages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const status = searchParams.get("status");
    const limit = Number.parseInt(searchParams.get("limit") || "50");

    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = user.role === "Admin" || user.role === "admin";
    const userBranchId = user.branchId;

    let whereConditions = [];

    if (branchId && branchId !== "undefined") {
      whereConditions.push(`branch_id = '${branchId}'`);
    } else if (!isAdmin) {
      whereConditions.push(`branch_id = '${userBranchId}'`);
    }

    if (status) {
      whereConditions.push(`status = '${status}'`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const packages = await sql`
      SELECT * FROM jumia_packages 
      ${sql.unsafe(whereClause)}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      data: packages,
      total: packages.length,
    });
  } catch (error) {
    console.error("Error getting Jumia packages:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get packages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create package
export async function POST(request: NextRequest) {
  try {
    const packageData = await request.json();

    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!packageData.tracking_id || !packageData.customer_name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: tracking_id, customer_name",
        },
        { status: 400 }
      );
    }

    // Check if package with this tracking ID already exists
    const existingPackage = await sql`
      SELECT id FROM jumia_packages 
      WHERE tracking_id = ${packageData.tracking_id} 
      AND branch_id = ${user.branchId}
    `;

    if (existingPackage.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Package with this tracking ID already exists",
        },
        { status: 400 }
      );
    }

    // Create the package
    const newPackage = await sql`
      INSERT INTO jumia_packages (
        id,
        tracking_id,
        customer_name,
        customer_phone,
        branch_id,
        user_id,
        status,
        received_at,
        notes,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${packageData.tracking_id},
        ${packageData.customer_name},
        ${packageData.customer_phone || null},
        ${user.branchId},
        ${user.id},
        'received',
        NOW(),
        ${packageData.notes || null},
        NOW(),
        NOW()
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: newPackage[0],
    });
  } catch (error) {
    console.error("Error creating Jumia package:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create package",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - Update package
export async function PUT(request: NextRequest) {
  try {
    const { id, updateData } = await request.json();

    if (!id || !updateData) {
      return NextResponse.json(
        { success: false, error: "Missing id or updateData" },
        { status: 400 }
      );
    }

    const updatedPackage = await sql`
      UPDATE jumia_packages 
      SET 
        customer_name = COALESCE(${updateData.customer_name}, customer_name),
        customer_phone = COALESCE(${updateData.customer_phone}, customer_phone),
        status = COALESCE(${updateData.status}, status),
        notes = COALESCE(${updateData.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updatedPackage.length === 0) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPackage[0],
    });
  } catch (error) {
    console.error("Error updating Jumia package:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update package",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete package
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing package id" },
        { status: 400 }
      );
    }

    const deletedPackage = await sql`
      DELETE FROM jumia_packages 
      WHERE id = ${id}
      RETURNING *
    `;

    if (deletedPackage.length === 0) {
      return NextResponse.json(
        { success: false, error: "Package not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deletedPackage[0],
    });
  } catch (error) {
    console.error("Error deleting Jumia package:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete package",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
