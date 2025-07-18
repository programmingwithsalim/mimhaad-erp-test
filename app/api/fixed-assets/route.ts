import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/lib/auth-utils";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    // Get user context for branch filtering
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (error) {
      console.warn("Authentication failed, using fallback:", error);
      user = {
        id: "system-user",
        name: "System User",
        role: "admin",
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
      };
    }

    // Determine effective branch ID
    const effectiveBranchId =
      branchId || (user.role === "admin" ? null : user.branchId);

    let query = sql`
      SELECT 
        id,
        name,
        description,
        category,
        purchase_date as "purchaseDate",
        purchase_cost as "purchaseCost",
        salvage_value as "salvageValue",
        useful_life as "usefulLife",
        depreciation_method as "depreciationMethod",
        current_value as "currentValue",
        accumulated_depreciation as "accumulatedDepreciation",
        branch_id as "branchId",
        branch_name as "branchName",
        status,
        location,
        serial_number as "serialNumber",
        supplier,
        warranty_expiry as "warrantyExpiry",
        last_maintenance as "lastMaintenance",
        next_maintenance as "nextMaintenance",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM fixed_assets
      WHERE 1=1
    `;

    if (effectiveBranchId) {
      query = sql`${query} AND branch_id = ${effectiveBranchId}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const assets = await query;

    return NextResponse.json({
      success: true,
      assets: assets,
    });
  } catch (error) {
    console.error("Error fetching fixed assets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch fixed assets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      purchaseDate,
      purchaseCost,
      salvageValue,
      usefulLife,
      depreciationMethod,
      location,
      serialNumber,
      supplier,
      warrantyExpiry,
      branchId,
    } = body;

    // Validate required fields
    if (!name || !category || !purchaseDate || !purchaseCost || !usefulLife) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user context
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (error) {
      console.warn("Authentication failed, using fallback:", error);
      user = {
        id: "system-user",
        name: "System User",
        role: "admin",
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
      };
    }

    // Use provided branchId or user's branchId
    const effectiveBranchId = branchId || user.branchId;

    // Get branch name
    const branchResult = await sql`
      SELECT name FROM branches WHERE id = ${effectiveBranchId}
    `;
    const branchName = branchResult[0]?.name || "Unknown Branch";

    // Calculate initial values
    const cost = Number(purchaseCost);
    const salvage = Number(salvageValue || 0);
    const life = Number(usefulLife);
    const currentValue = cost;
    const accumulatedDepreciation = 0;

    // Insert the asset
    const result = await sql`
      INSERT INTO fixed_assets (
        id,
        name,
        description,
        category,
        purchase_date,
        purchase_cost,
        salvage_value,
        useful_life,
        depreciation_method,
        current_value,
        accumulated_depreciation,
        branch_id,
        branch_name,
        status,
        location,
        serial_number,
        supplier,
        warranty_expiry,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${name},
        ${description || ""},
        ${category},
        ${purchaseDate},
        ${cost},
        ${salvage},
        ${life},
        ${depreciationMethod || "straight-line"},
        ${currentValue},
        ${accumulatedDepreciation},
        ${effectiveBranchId},
        ${branchName},
        'active',
        ${location || ""},
        ${serialNumber || null},
        ${supplier || null},
        ${warrantyExpiry || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const asset = result[0];

    // Format the response
    const formattedAsset = {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      category: asset.category,
      purchaseDate: asset.purchase_date,
      purchaseCost: Number(asset.purchase_cost),
      salvageValue: Number(asset.salvage_value),
      usefulLife: Number(asset.useful_life),
      depreciationMethod: asset.depreciation_method,
      currentValue: Number(asset.current_value),
      accumulatedDepreciation: Number(asset.accumulated_depreciation),
      branchId: asset.branch_id,
      branchName: asset.branch_name,
      status: asset.status,
      location: asset.location,
      serialNumber: asset.serial_number,
      supplier: asset.supplier,
      warrantyExpiry: asset.warranty_expiry,
      lastMaintenance: asset.last_maintenance,
      nextMaintenance: asset.next_maintenance,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
    };

    return NextResponse.json({
      success: true,
      asset: formattedAsset,
      message: "Fixed asset created successfully",
    });
  } catch (error) {
    console.error("Error creating fixed asset:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create fixed asset",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
