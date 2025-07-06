import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { AuditLoggerService } from "@/lib/services/audit-logger-service";
import { UnifiedGLPostingService } from "@/lib/services/unified-gl-posting-service";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  let requestData: any = null;
  let receiptFile: File | null = null;

  try {
    // Check if the request is multipart/form-data (file upload) or JSON
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      requestData = Object.fromEntries(formData.entries());
      receiptFile = formData.get("receipt") as File;

      console.log("📝 [COMMISSION] FormData received:", {
        ...requestData,
        receiptFile: receiptFile
          ? `${receiptFile.name} (${receiptFile.size} bytes)`
          : null,
      });
    } else {
      requestData = await request.json();
      console.log(
        "📝 [COMMISSION] JSON request data:",
        JSON.stringify(requestData, null, 2)
      );
    }

    // Extract user context from headers
    const userId = request.headers.get("x-user-id") || requestData.createdBy;
    const userName =
      request.headers.get("x-user-name") || requestData.createdByName;
    const userRole = request.headers.get("x-user-role") || requestData.userRole;
    const branchId = request.headers.get("x-branch-id") || requestData.branchId;
    const branchName =
      request.headers.get("x-branch-name") || requestData.branchName;

    console.log("📝 [COMMISSION] User context:", {
      userId,
      userName,
      userRole,
      branchId,
      branchName,
    });

    // Validate required fields
    const {
      source,
      sourceName,
      reference,
      month,
      amount,
      transactionVolume,
      commissionRate,
      description,
      notes,
      status = "paid", // Default to paid
    } = requestData;

    if (!source || !sourceName || !reference || !month || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate user context
    if (!userId || !branchId) {
      return NextResponse.json(
        { error: "User context is required" },
        { status: 400 }
      );
    }

    // Generate proper UUID for commission ID
    const { v4: uuidv4 } = await import("uuid");
    const commissionId = uuidv4();

    console.log("📝 [COMMISSION] Creating commission with ID:", commissionId);

    // Log commission creation attempt
    await AuditLoggerService.log({
      userId,
      username: userName || "Unknown User",
      actionType: "commission_creation_attempt",
      entityType: "commission",
      entityId: commissionId,
      description: `Attempting to create commission for ${sourceName}`,
      details: {
        source,
        sourceName,
        reference,
        month,
        amount: Number(amount),
        transactionVolume: Number(transactionVolume || 0),
        commissionRate: Number(commissionRate || 0),
        status,
      },
      severity: "medium",
      branchId,
      branchName: branchName || "Unknown Branch",
      status: "success",
    });

    // Insert commission into database
    const insertResult = await sql`
      INSERT INTO commissions (
        id,
        source,
        source_name,
        reference,
        month,
        amount,
        transaction_volume,
        commission_rate,
        description,
        notes,
        status,
        created_by,
        created_by_name,
        branch_id,
        branch_name,
        created_at,
        updated_at
      ) VALUES (
        ${commissionId},
        ${source},
        ${sourceName},
        ${reference},
        ${month},
        ${Number(amount)},
        ${Number(transactionVolume || 0)},
        ${Number(commissionRate || 0)},
        ${description || ""},
        ${notes || ""},
        ${status},
        ${userId},
        ${userName || "Unknown User"},
        ${branchId},
        ${branchName || "Unknown Branch"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const commission = insertResult[0];
    console.log(
      "✅ [COMMISSION] Commission created in database:",
      commission.id
    );

    // Handle receipt file upload if provided
    if (receiptFile) {
      try {
        console.log(
          "📎 [COMMISSION] Processing receipt file:",
          receiptFile.name
        );

        // Convert file to base64 for storage (simple approach)
        const arrayBuffer = await receiptFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // Store receipt metadata in database
        await sql`
          UPDATE commissions 
          SET 
            receipt_filename = ${receiptFile.name},
            receipt_size = ${receiptFile.size},
            receipt_type = ${receiptFile.type},
            receipt_data = ${base64},
            updated_at = NOW()
          WHERE id = ${commission.id}
        `;

        console.log("✅ [COMMISSION] Receipt file stored successfully");
      } catch (fileError) {
        console.error(
          "❌ [COMMISSION] Failed to store receipt file:",
          fileError
        );
        // Don't fail the commission creation if file upload fails
        await AuditLoggerService.log({
          userId,
          username: userName || "Unknown User",
          actionType: "commission_receipt_upload_failure",
          entityType: "commission",
          entityId: commission.id,
          description: "Failed to upload receipt file",
          details: {
            error:
              fileError instanceof Error
                ? fileError.message
                : "Unknown file error",
            fileName: receiptFile.name,
            fileSize: receiptFile.size,
          },
          severity: "medium",
          branchId,
          branchName: branchName || "Unknown Branch",
          status: "failure",
          errorMessage:
            fileError instanceof Error
              ? fileError.message
              : "Unknown file error",
        });
      }
    }

    // Post to GL if status is paid
    if (status === "paid") {
      try {
        console.log("📊 [COMMISSION] Posting to GL...");

        // Get the float account to determine the correct GL transaction type
        const floatAccount = await sql`
          SELECT account_type, provider FROM float_accounts 
          WHERE id = ${source}
        `;

        // Map float account type to GL transaction type
        const getCommissionTransactionType = (accountType: string): string => {
          switch (accountType.toLowerCase()) {
            case "momo":
              return "momo_float";
            case "agency-banking":
              return "agency_banking_float";
            case "power":
              return "power_float";
            case "e-zwich":
              return "e_zwich_float";
            case "jumia":
              return "jumia_float";
            default:
              return "agency_banking_float"; // Default fallback
          }
        };

        const transactionType =
          floatAccount.length > 0
            ? getCommissionTransactionType(floatAccount[0].account_type)
            : "agency_banking_float";

        console.log(
          "📊 [COMMISSION] Using GL transaction type:",
          transactionType
        );

        const glResult = await UnifiedGLPostingService.createGLEntries({
          transactionId: commission.id,
          sourceModule: "commissions",
          transactionType: transactionType,
          amount: Number(commission.amount),
          fee: 0, // No fees for commissions
          reference: commission.reference,
          processedBy: userId,
          branchId: commission.branch_id,
          branchName: commission.branch_name,
          metadata: {
            source: commission.source,
            sourceName: commission.source_name,
            month: commission.month,
            transactionVolume: Number(commission.transaction_volume || 0),
            commissionRate: Number(commission.commission_rate || 0),
          },
        });

        if (!glResult.success) {
          throw new Error(glResult.error || "GL posting failed");
        }

        console.log("✅ [COMMISSION] Posted to GL successfully");
      } catch (glError) {
        console.error("❌ [COMMISSION] GL posting failed:", glError);
        // Don't fail the commission creation if GL posting fails
        await AuditLoggerService.log({
          userId,
          username: userName || "Unknown User",
          actionType: "commission_gl_posting_failure",
          entityType: "commission",
          entityId: commission.id,
          description: "Failed to post commission to GL",
          details: {
            error:
              glError instanceof Error ? glError.message : "Unknown GL error",
            commissionData: commission,
          },
          severity: "high",
          branchId,
          branchName: branchName || "Unknown Branch",
          status: "failure",
          errorMessage:
            glError instanceof Error ? glError.message : "Unknown GL error",
        });
      }
    }

    // Log successful commission creation
    await AuditLoggerService.log({
      userId,
      username: userName || "Unknown User",
      actionType: "commission_created",
      entityType: "commission",
      entityId: commission.id,
      description: `Successfully created commission for ${commission.source_name}`,
      details: {
        commissionId: commission.id,
        source: commission.source,
        sourceName: commission.source_name,
        amount: Number(commission.amount),
        reference: commission.reference,
        status: commission.status,
      },
      severity: Number(commission.amount) > 10000 ? "high" : "medium",
      branchId,
      branchName: branchName || "Unknown Branch",
      status: "success",
    });

    return NextResponse.json({
      success: true,
      message: "Commission created successfully",
      commission: {
        id: commission.id,
        source: commission.source,
        sourceName: commission.source_name,
        reference: commission.reference,
        month: commission.month,
        amount: Number(commission.amount),
        transactionVolume: Number(commission.transaction_volume),
        commissionRate: Number(commission.commission_rate),
        description: commission.description,
        notes: commission.notes,
        status: commission.status,
        createdBy: commission.created_by,
        createdByName: commission.created_by_name,
        branchId: commission.branch_id,
        branchName: commission.branch_name,
        createdAt: commission.created_at,
        updatedAt: commission.updated_at,
      },
    });
  } catch (error: any) {
    console.error("❌ [COMMISSION] Error creating commission:", error);

    // Log the error
    try {
      if (requestData) {
        await AuditLoggerService.log({
          userId: requestData.createdBy || "unknown",
          username: requestData.createdByName || "unknown",
          actionType: "commission_creation_failure",
          entityType: "commission",
          description: "Failed to create commission",
          details: {
            error: error.message,
            stack: error.stack,
            requestData,
          },
          severity: "critical",
          branchId: requestData.branchId || "unknown",
          branchName: requestData.branchName || "Unknown Branch",
          status: "failure",
          errorMessage: error.message,
        });
      }
    } catch (auditError) {
      console.error(
        "❌ [COMMISSION] Failed to log error to audit:",
        auditError
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create commission",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const branchId = searchParams.get("branchId");

    // Get user context from headers for branch filtering
    const userBranchId = request.headers.get("x-branch-id");
    const userRole = request.headers.get("x-user-role");

    // If no specific branchId provided, use user's branch (unless admin)
    const effectiveBranchId =
      branchId || (userRole === "admin" ? null : userBranchId);

    // Build the base query using tagged template literals
    let baseQuery = sql`
      SELECT 
        id,
        source,
        source_name as "sourceName",
        reference,
        month,
        amount,
        transaction_volume as "transactionVolume",
        commission_rate as "commissionRate",
        description,
        notes,
        status,
        created_by as "createdBy",
        created_by_name as "createdByName",
        branch_id as "branchId",
        branch_name as "branchName",
        created_at as "createdAt",
        updated_at as "updatedAt",
        receipt_filename,
        receipt_size,
        receipt_type
      FROM commissions
      WHERE 1=1
    `;

    // Add filters using conditional logic
    if (source) {
      const sources = source.split(",");
      baseQuery = sql`${baseQuery} AND source = ANY(${sources})`;
    }

    if (status) {
      const statuses = status.split(",");
      baseQuery = sql`${baseQuery} AND status = ANY(${statuses})`;
    }

    if (startDate) {
      baseQuery = sql`${baseQuery} AND month >= ${startDate}`;
    }

    if (endDate) {
      baseQuery = sql`${baseQuery} AND month <= ${endDate}`;
    }

    // Branch filtering - only show commissions for user's branch unless admin
    if (effectiveBranchId) {
      baseQuery = sql`${baseQuery} AND branch_id = ${effectiveBranchId}`;
    }

    // Add ordering
    const finalQuery = sql`${baseQuery} ORDER BY created_at DESC`;

    console.log(
      "📝 [COMMISSION] Executing query with branch filtering:",
      effectiveBranchId
    );

    const commissions = await finalQuery;

    return NextResponse.json(commissions);
  } catch (error: any) {
    console.error("❌ [COMMISSION] Error fetching commissions:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch commissions",
      },
      { status: 500 }
    );
  }
}
