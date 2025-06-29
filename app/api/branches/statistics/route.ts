import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("Fetching branch statistics...")

    // Check if branches table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'branches'
      ) as exists
    `

    if (!tableExists[0]?.exists) {
      console.log("Branches table does not exist")
      return NextResponse.json({
        totalBranches: 0,
        activeBranches: 0,
        inactiveBranches: 0,
        totalStaff: 0,
        totalManagers: 0,
        averageStaffPerBranch: 0,
        regionalDistribution: [],
      })
    }

    // Get basic branch statistics
    const [basicStats] = await sql`
      SELECT 
        COUNT(*) as total_branches,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_branches,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_branches,
        COALESCE(SUM(staff_count), 0) as total_staff,
        COUNT(DISTINCT manager) as total_managers
      FROM branches
    `

    const totalBranches = Number(basicStats.total_branches || 0)
    const activeBranches = Number(basicStats.active_branches || 0)
    const inactiveBranches = Number(basicStats.inactive_branches || 0)
    const totalStaff = Number(basicStats.total_staff || 0)
    const totalManagers = Number(basicStats.total_managers || 0)
    const averageStaffPerBranch = totalBranches > 0 ? totalStaff / totalBranches : 0

    // Get regional distribution
    const regionalDistribution = await sql`
      SELECT 
        COALESCE(region, 'Unknown') as region,
        COUNT(*) as branch_count,
        COALESCE(SUM(staff_count), 0) as staff_count
      FROM branches
      WHERE status = 'active'
      GROUP BY region
      ORDER BY branch_count DESC
    `

    const formattedRegionalDistribution = regionalDistribution.map((row) => ({
      region: row.region,
      branchCount: Number(row.branch_count || 0),
      staffCount: Number(row.staff_count || 0),
    }))

    const statistics = {
      totalBranches,
      activeBranches,
      inactiveBranches,
      totalStaff,
      totalManagers,
      averageStaffPerBranch: Number(averageStaffPerBranch.toFixed(1)),
      regionalDistribution: formattedRegionalDistribution,
    }

    console.log("Branch statistics:", statistics)

    return NextResponse.json(statistics)
  } catch (error) {
    console.error("Error fetching branch statistics:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch branch statistics",
        details: error instanceof Error ? error.message : "Unknown error",
        totalBranches: 0,
        activeBranches: 0,
        inactiveBranches: 0,
        totalStaff: 0,
        totalManagers: 0,
        averageStaffPerBranch: 0,
        regionalDistribution: [],
      },
      { status: 500 },
    )
  }
}
