"use server";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const format = searchParams.get("format") || "csv";
    const userRole = searchParams.get("userRole");
    const userBranchId = searchParams.get("userBranchId");
    const branch = searchParams.get("branch");

    // Role-based access control
    const isAdmin = userRole === "Admin";
    const isFinance = userRole === "Finance";
    const isManager = userRole === "Manager";

    if (!isAdmin && !isFinance && !isManager) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to export reports",
        },
        { status: 403 }
      );
    }

    // Determine effective branch filter
    const effectiveBranchId = isAdmin ? branch : userBranchId;
    const branchFilter =
      effectiveBranchId && effectiveBranchId !== "all"
        ? `AND branch_id = '${effectiveBranchId}'`
        : "";

    // Get transaction data for export
    const transactionQuery = `
      SELECT 
        'momo' as service,
        created_at,
        amount,
        fee,
        status,
        reference
      FROM momo_transactions 
      WHERE created_at BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'agency_banking' as service,
        created_at,
        amount,
        fee,
        status,
        reference
      FROM agency_banking_transactions 
      WHERE created_at BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'ezwich' as service,
        created_at,
        amount,
        fee,
        status,
        reference
      FROM e_zwich_withdrawals 
      WHERE created_at BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'power' as service,
        created_at,
        amount,
        fee,
        status,
        reference
      FROM power_transactions 
      WHERE created_at BETWEEN '${from}' AND '${to}' ${branchFilter}
      UNION ALL
      SELECT 
        'jumia' as service,
        created_at,
        amount,
        fee,
        status,
        reference
      FROM jumia_transactions 
      WHERE created_at BETWEEN '${from}' AND '${to}' ${branchFilter}
      ORDER BY created_at DESC
    `;

    const transactions = await sql.unsafe(transactionQuery);

    // Generate export content based on format
    let content = "";
    let filename = "";
    let contentType = "";

    if (format === "csv") {
      // Generate CSV content
      const headers = [
        "Service",
        "Date",
        "Amount",
        "Fee",
        "Status",
        "Reference",
      ];
      content = headers.join(",") + "\n";

      transactions.forEach((transaction: any) => {
        const row = [
          transaction.service,
          transaction.created_at,
          transaction.amount,
          transaction.fee,
          transaction.status,
          transaction.reference,
        ]
          .map((field) => `"${field || ""}"`)
          .join(",");
        content += row + "\n";
      });

      filename = `financial-report-${from}-${to}.csv`;
      contentType = "text/csv";
    } else if (format === "excel") {
      // For now, return CSV as Excel (you can implement proper Excel generation later)
      const headers = [
        "Service",
        "Date",
        "Amount",
        "Fee",
        "Status",
        "Reference",
      ];
      content = headers.join("\t") + "\n";

      transactions.forEach((transaction: any) => {
        const row = [
          transaction.service,
          transaction.created_at,
          transaction.amount,
          transaction.fee,
          transaction.status,
          transaction.reference,
        ].join("\t");
        content += row + "\n";
      });

      filename = `financial-report-${from}-${to}.xls`;
      contentType = "application/vnd.ms-excel";
    } else if (format === "pdf") {
      // For now, return a simple text representation
      content = `Financial Report\n`;
      content += `Period: ${from} to ${to}\n`;
      content += `Generated: ${new Date().toISOString()}\n\n`;

      const totalAmount = transactions.reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      const totalFees = transactions.reduce(
        (sum: number, t: any) => sum + Number(t.fee || 0),
        0
      );

      content += `Total Transactions: ${transactions.length}\n`;
      content += `Total Amount: GHS ${totalAmount.toLocaleString()}\n`;
      content += `Total Fees: GHS ${totalFees.toLocaleString()}\n\n`;

      content += `Transaction Details:\n`;
      transactions.forEach((transaction: any, index: number) => {
        content += `${index + 1}. ${transaction.service} - GHS ${
          transaction.amount
        } (Fee: GHS ${transaction.fee})\n`;
      });

      filename = `financial-report-${from}-${to}.txt`;
      contentType = "text/plain";
    }

    // Return the file
    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
