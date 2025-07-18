import { NextResponse } from "next/server";
import { getUserPermissions } from "@/lib/rbac-enhanced";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized", permissions: [] },
        { status: 401 }
      );
    }

    const permissions = await getUserPermissions(user.id);

    return NextResponse.json({
      permissions,
      role: user.role,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions", permissions: [] },
      { status: 500 }
    );
  }
}
