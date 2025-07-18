import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("🔄 Initializing fixed assets table...");

    // Check if fixed_assets table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fixed_assets'
      ) as exists
    `;

    if (tableExists[0]?.exists) {
      console.log("✅ Fixed assets table already exists");
      return NextResponse.json({
        success: true,
        message: "Fixed assets table already exists",
      });
    }

    // Create the fixed_assets table
    await sql`
      CREATE TABLE fixed_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        purchase_date DATE NOT NULL,
        purchase_cost DECIMAL(15,2) NOT NULL,
        salvage_value DECIMAL(15,2) DEFAULT 0,
        useful_life INTEGER NOT NULL,
        depreciation_method VARCHAR(50) DEFAULT 'straight-line',
        current_value DECIMAL(15,2) NOT NULL,
        accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
        branch_id UUID REFERENCES branches(id),
        branch_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        location VARCHAR(255),
        serial_number VARCHAR(100),
        supplier VARCHAR(255),
        warranty_expiry DATE,
        last_maintenance DATE,
        next_maintenance DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`CREATE INDEX idx_fixed_assets_branch_id ON fixed_assets(branch_id)`;
    await sql`CREATE INDEX idx_fixed_assets_category ON fixed_assets(category)`;
    await sql`CREATE INDEX idx_fixed_assets_status ON fixed_assets(status)`;
    await sql`CREATE INDEX idx_fixed_assets_purchase_date ON fixed_assets(purchase_date)`;

    console.log("✅ Fixed assets table created successfully");

    // Insert some sample data
    const sampleAssets = [
      {
        name: "Office Building",
        description: "Main office building for headquarters",
        category: "Buildings",
        purchaseDate: "2020-01-15",
        purchaseCost: 5000000,
        salvageValue: 500000,
        usefulLife: 30,
        depreciationMethod: "straight-line",
        currentValue: 5000000,
        accumulatedDepreciation: 0,
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        branchName: "Main Branch",
        location: "123 Main Street, Accra",
        serialNumber: "BLD-001",
        supplier: "Accra Construction Ltd",
      },
      {
        name: "Delivery Van",
        description: "Toyota Hiace delivery van",
        category: "Vehicles",
        purchaseDate: "2022-03-10",
        purchaseCost: 150000,
        salvageValue: 15000,
        usefulLife: 8,
        depreciationMethod: "straight-line",
        currentValue: 150000,
        accumulatedDepreciation: 0,
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        branchName: "Main Branch",
        location: "Main Branch Garage",
        serialNumber: "VAN-001",
        supplier: "Toyota Ghana",
        warrantyExpiry: "2025-03-10",
      },
      {
        name: "Computer Server",
        description: "Dell PowerEdge server for data processing",
        category: "Computer Equipment",
        purchaseDate: "2023-06-20",
        purchaseCost: 25000,
        salvageValue: 2500,
        usefulLife: 5,
        depreciationMethod: "straight-line",
        currentValue: 25000,
        accumulatedDepreciation: 0,
        branchId: "635844ab-029a-43f8-8523-d7882915266a",
        branchName: "Main Branch",
        location: "Server Room",
        serialNumber: "SRV-001",
        supplier: "Dell Technologies",
        warrantyExpiry: "2026-06-20",
      },
    ];

    for (const asset of sampleAssets) {
      await sql`
        INSERT INTO fixed_assets (
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
          warranty_expiry
        ) VALUES (
          ${asset.name},
          ${asset.description},
          ${asset.category},
          ${asset.purchaseDate},
          ${asset.purchaseCost},
          ${asset.salvageValue},
          ${asset.usefulLife},
          ${asset.depreciationMethod},
          ${asset.currentValue},
          ${asset.accumulatedDepreciation},
          ${asset.branchId},
          ${asset.branchName},
          'active',
          ${asset.location},
          ${asset.serialNumber},
          ${asset.supplier},
          ${asset.warrantyExpiry}
        )
      `;
    }

    console.log(`✅ Inserted ${sampleAssets.length} sample fixed assets`);

    return NextResponse.json({
      success: true,
      message: "Fixed assets table initialized successfully",
      assetsCreated: sampleAssets.length,
    });
  } catch (error) {
    console.error("❌ Error initializing fixed assets table:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize fixed assets table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
