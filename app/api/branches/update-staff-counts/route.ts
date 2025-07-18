import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { BranchStaffService } from "@/lib/services/branch-staff-service";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("Updating staff counts for all branches...");

    // First, check if user_branch_assignments table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_branch_assignments'
      ) as exists
    `;

    if (!tableExists[0]?.exists) {
      console.log(
        "user_branch_assignments table does not exist, creating it..."
      );

      // Create the user_branch_assignments table
      await sql`
        CREATE TABLE IF NOT EXISTS user_branch_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, branch_id)
        )
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_user_id ON user_branch_assignments(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_branch_id ON user_branch_assignments(branch_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_branch_assignments_primary ON user_branch_assignments(is_primary)`;

      console.log("user_branch_assignments table created successfully");

      // Populate the table with existing user-branch relationships
      const usersWithBranches = await sql`
        SELECT id, primary_branch_id, branch_id 
        FROM users 
        WHERE status = 'active' 
        AND (primary_branch_id IS NOT NULL OR branch_id IS NOT NULL)
      `;

      for (const user of usersWithBranches) {
        const branchId = user.primary_branch_id || user.branch_id;
        if (branchId) {
          try {
            await sql`
              INSERT INTO user_branch_assignments (user_id, branch_id, is_primary)
              VALUES (${user.id}, ${branchId}, ${!!user.primary_branch_id})
              ON CONFLICT (user_id, branch_id) DO NOTHING
            `;
          } catch (error) {
            console.warn(
              `Failed to assign user ${user.id} to branch ${branchId}:`,
              error
            );
          }
        }
      }

      console.log(
        `Populated user_branch_assignments with ${usersWithBranches.length} users`
      );
    }

    // Get all active branches
    const branches = await sql`
      SELECT id, name FROM branches WHERE status = 'active'
    `;

    const results = {
      totalBranches: branches.length,
      updatedBranches: 0,
      errors: [] as string[],
      branchResults: [] as Array<{
        id: string;
        name: string;
        staffCount: number;
      }>,
    };

    // Update staff count for each branch
    for (const branch of branches) {
      try {
        const staffCount = await BranchStaffService.updateBranchStaffCount(
          branch.id
        );
        results.updatedBranches++;
        results.branchResults.push({
          id: branch.id,
          name: branch.name,
          staffCount,
        });
        console.log(`✅ Updated ${branch.name}: ${staffCount} staff`);
      } catch (error) {
        const errorMessage = `Failed to update ${branch.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        results.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    console.log(
      `Staff count update completed: ${results.updatedBranches}/${results.totalBranches} branches updated`
    );

    return NextResponse.json({
      success: true,
      message: `Updated staff count for ${results.updatedBranches} out of ${results.totalBranches} branches`,
      results,
    });
  } catch (error) {
    console.error("Error updating staff counts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update staff counts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
