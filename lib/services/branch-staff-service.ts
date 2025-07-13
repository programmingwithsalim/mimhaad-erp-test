import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export class BranchStaffService {
  /**
   * Calculate and update staff count for a specific branch
   */
  static async updateBranchStaffCount(branchId: string): Promise<number> {
    try {
      // Count active users assigned to this branch through user_branch_assignments
      const result = await sql`
        SELECT COUNT(DISTINCT u.id) as staff_count
        FROM users u
        INNER JOIN user_branch_assignments uba ON u.id = uba.user_id
        WHERE uba.branch_id = ${branchId} 
        AND u.status = 'active'
      `;

      const staffCount = Number(result[0]?.staff_count || 0);

      // Update the branch's staff_count
      await sql`
        UPDATE branches 
        SET staff_count = ${staffCount}, updated_at = NOW()
        WHERE id = ${branchId}
      `;

      console.log(`Updated branch ${branchId} staff count to ${staffCount}`);
      return staffCount;
    } catch (error) {
      console.error("Error updating branch staff count:", error);
      throw error;
    }
  }

  /**
   * Update staff count for all branches
   */
  static async updateAllBranchStaffCounts(): Promise<void> {
    try {
      // Get all branch IDs
      const branches = await sql`
        SELECT id FROM branches WHERE status = 'active'
      `;

      // Update staff count for each branch
      for (const branch of branches) {
        await this.updateBranchStaffCount(branch.id);
      }

      console.log(`Updated staff count for ${branches.length} branches`);
    } catch (error) {
      console.error("Error updating all branch staff counts:", error);
      throw error;
    }
  }

  /**
   * Get staff count for a specific branch
   */
  static async getBranchStaffCount(branchId: string): Promise<number> {
    try {
      const result = await sql`
        SELECT COUNT(DISTINCT u.id) as staff_count
        FROM users u
        INNER JOIN user_branch_assignments uba ON u.id = uba.user_id
        WHERE uba.branch_id = ${branchId} 
        AND u.status = 'active'
      `;

      return Number(result[0]?.staff_count || 0);
    } catch (error) {
      console.error("Error getting branch staff count:", error);
      return 0;
    }
  }

  /**
   * Get staff count for all branches
   */
  static async getAllBranchStaffCounts(): Promise<Record<string, number>> {
    try {
      const result = await sql`
        SELECT 
          b.id as branch_id,
          b.name as branch_name,
          COUNT(DISTINCT u.id) as staff_count
        FROM branches b
        LEFT JOIN user_branch_assignments uba ON b.id = uba.branch_id
        LEFT JOIN users u ON uba.user_id = u.id AND u.status = 'active'
        WHERE b.status = 'active'
        GROUP BY b.id, b.name
      `;

      const staffCounts: Record<string, number> = {};
      result.forEach((row: any) => {
        staffCounts[row.branch_id] = Number(row.staff_count || 0);
      });

      return staffCounts;
    } catch (error) {
      console.error("Error getting all branch staff counts:", error);
      return {};
    }
  }

  /**
   * Trigger staff count update when user is assigned to branch
   */
  static async onUserBranchAssignment(
    userId: string,
    branchId: string
  ): Promise<void> {
    try {
      await this.updateBranchStaffCount(branchId);
      console.log(
        `Updated staff count for branch ${branchId} after user ${userId} assignment`
      );
    } catch (error) {
      console.error("Error updating staff count after user assignment:", error);
    }
  }

  /**
   * Trigger staff count update when user is removed from branch
   */
  static async onUserBranchRemoval(
    userId: string,
    branchId: string
  ): Promise<void> {
    try {
      await this.updateBranchStaffCount(branchId);
      console.log(
        `Updated staff count for branch ${branchId} after user ${userId} removal`
      );
    } catch (error) {
      console.error("Error updating staff count after user removal:", error);
    }
  }
}
