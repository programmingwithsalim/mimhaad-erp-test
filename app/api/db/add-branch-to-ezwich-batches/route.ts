import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔄 Starting migration: Add branch and partner bank columns to ezwich_card_batches"
    );

    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ezwich_card_batches'
      );
    `;

    if (!tableExists[0].exists) {
      console.log(
        "📋 Creating ezwich_card_batches table with all required columns"
      );

      await sql`
        CREATE TABLE ezwich_card_batches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_code VARCHAR(50) UNIQUE NOT NULL,
          quantity_received INTEGER NOT NULL,
          quantity_issued INTEGER DEFAULT 0,
          quantity_available INTEGER GENERATED ALWAYS AS (quantity_received - quantity_issued) STORED,
          card_type VARCHAR(50) DEFAULT 'standard',
          unit_cost DECIMAL(10,2) DEFAULT 0.00,
          total_cost DECIMAL(10,2) DEFAULT 0.00,
          partner_bank_id UUID,
          partner_bank_name VARCHAR(100),
          expiry_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          branch_id VARCHAR(100) NOT NULL,
          branch_name VARCHAR(100),
          created_by VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        )
      `;

      console.log("✅ Created ezwich_card_batches table with all columns");
    } else {
      console.log("📋 Table exists, checking for missing columns");

      // Check for branch_id column
      const branchIdExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'branch_id'
        );
      `;

      if (!branchIdExists[0].exists) {
        console.log("➕ Adding branch_id column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN branch_id VARCHAR(100) NOT NULL DEFAULT '635844ab-029a-43f8-8523-d7882915266a'
        `;
        console.log("✅ Added branch_id column");
      }

      // Check for branch_name column
      const branchNameExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'branch_name'
        );
      `;

      if (!branchNameExists[0].exists) {
        console.log("➕ Adding branch_name column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN branch_name VARCHAR(100)
        `;
        console.log("✅ Added branch_name column");
      }

      // Check for partner_bank_id column
      const partnerBankIdExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'partner_bank_id'
        );
      `;

      if (!partnerBankIdExists[0].exists) {
        console.log("➕ Adding partner_bank_id column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN partner_bank_id UUID
        `;
        console.log("✅ Added partner_bank_id column");
      }

      // Check for partner_bank_name column
      const partnerBankNameExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'partner_bank_name'
        );
      `;

      if (!partnerBankNameExists[0].exists) {
        console.log("➕ Adding partner_bank_name column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN partner_bank_name VARCHAR(100)
        `;
        console.log("✅ Added partner_bank_name column");
      }

      // Check for unit_cost column
      const unitCostExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'unit_cost'
        );
      `;

      if (!unitCostExists[0].exists) {
        console.log("➕ Adding unit_cost column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN unit_cost DECIMAL(10,2) DEFAULT 0.00
        `;
        console.log("✅ Added unit_cost column");
      }

      // Check for total_cost column
      const totalCostExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'ezwich_card_batches' 
          AND column_name = 'total_cost'
        );
      `;

      if (!totalCostExists[0].exists) {
        console.log("➕ Adding total_cost column");
        await sql`
          ALTER TABLE ezwich_card_batches 
          ADD COLUMN total_cost DECIMAL(10,2) DEFAULT 0.00
        `;
        console.log("✅ Added total_cost column");
      }

      // Update existing records with branch information if needed
      const existingRecords = await sql`
        SELECT COUNT(*) as count FROM ezwich_card_batches 
        WHERE branch_id = '635844ab-029a-43f8-8523-d7882915266a' 
        AND branch_name IS NULL
      `;

      if (existingRecords[0].count > 0) {
        console.log("🔄 Updating existing records with branch name");
        await sql`
          UPDATE ezwich_card_batches 
          SET branch_name = 'Main Branch' 
          WHERE branch_id = '635844ab-029a-43f8-8523-d7882915266a' 
          AND branch_name IS NULL
        `;
        console.log("✅ Updated existing records with branch name");
      }
    }

    // Verify the table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ezwich_card_batches' 
      ORDER BY ordinal_position
    `;

    console.log("📋 Final table structure:");
    columns.forEach((col: any) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })`
      );
    });

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      tableStructure: columns,
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
