import { NextResponse } from "next/server";
import { getDatabaseSession } from "@/lib/database-session-service";
import {
  normalizeRole,
  hasPermission,
  hasAnyPermission,
  type Role,
  type Permission,
  PERMISSIONS,
} from "@/lib/rbac/unified-rbac";

export async function GET(request: Request) {
  try {
    const session = await getDatabaseSession(request as any);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRole = normalizeRole(session.user.role);

    if (!userRole) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Test various permissions
    const permissionTests = {
      canViewDashboard: hasPermission(userRole, PERMISSIONS.VIEW_DASHBOARD),
      canViewTransactions: hasPermission(
        userRole,
        PERMISSIONS.VIEW_TRANSACTIONS
      ),
      canCreateTransactions: hasPermission(
        userRole,
        PERMISSIONS.CREATE_TRANSACTIONS
      ),
      canApproveTransactions: hasPermission(
        userRole,
        PERMISSIONS.APPROVE_TRANSACTIONS
      ),
      canManageUsers: hasPermission(userRole, PERMISSIONS.VIEW_USERS),
      canManageBranches: hasPermission(userRole, PERMISSIONS.MANAGE_BRANCHES),
      canViewReports: hasPermission(userRole, PERMISSIONS.VIEW_REPORTS),
      canManageSettings: hasPermission(userRole, PERMISSIONS.MANAGE_SETTINGS),
    };

    // Test transaction processing permissions
    const transactionPermissions = [
      PERMISSIONS.PROCESS_MOMO,
      PERMISSIONS.PROCESS_AGENCY_BANKING,
      PERMISSIONS.PROCESS_EZWICH,
      PERMISSIONS.PROCESS_POWER,
      PERMISSIONS.PROCESS_JUMIA,
    ];

    const canProcessAnyTransaction = hasAnyPermission(
      userRole,
      transactionPermissions
    );

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: `${session.user.firstName} ${session.user.lastName}`,
        role: session.user.role,
        normalizedRole: userRole,
      },
      permissions: permissionTests,
      canProcessTransactions: canProcessAnyTransaction,
      allPermissions: Object.values(PERMISSIONS).filter((permission) =>
        hasPermission(userRole, permission)
      ),
    });
  } catch (error) {
    console.error("RBAC test error:", error);
    return NextResponse.json(
      {
        error: "RBAC test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
