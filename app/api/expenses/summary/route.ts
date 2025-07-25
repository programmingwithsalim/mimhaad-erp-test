import { type NextRequest, NextResponse } from "next/server";
import { ExpenseService } from "@/lib/expense-service";

export async function GET(request: NextRequest) {
  try {
    const summary = await ExpenseService.getExpenseStatistics();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error in GET /api/expenses/summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense summary" },
      { status: 500 }
    );
  }
}
