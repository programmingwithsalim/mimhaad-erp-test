import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { BranchStaffService } from "@/lib/services/branch-staff-service";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log("Updating staff counts for all branches...");

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
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
