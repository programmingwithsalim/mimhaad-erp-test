import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const branchId = searchParams.get("branchId")
    const month = searchParams.get("month")

    const whereConditions = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (status && status !== "all") {
      whereConditions.push(`status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (branchId && branchId !== "all") {
      whereConditions.push(`branch_id = $${paramIndex}`)
      queryParams.push(branchId)
      paramIndex++
    }

    if (month) {
      whereConditions.push(`month = $${paramIndex}`)
      queryParams.push(month)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const commissions = await sql`
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
        receipt_url as "receiptUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM commissions
      ${whereConditions.length > 0 ? sql.unsafe(`WHERE ${whereConditions.join(" AND ")}`) : sql``}
      ORDER BY created_at DESC
    `

    return NextResponse.json(commissions)
  } catch (error) {
    console.error("Error fetching commissions:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch commissions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let data: any

    console.log("Commission POST request - Content Type:", contentType)

    // Handle FormData (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      console.log("Processing FormData submission")

      // Extract form fields
      data = {
        source: formData.get("source")?.toString() || "",
        sourceName: formData.get("sourceName")?.toString() || "",
        reference: formData.get("reference")?.toString() || "",
        month: formData.get("month")?.toString() || "",
        amount: Number.parseFloat(formData.get("amount")?.toString() || "0"),
        transactionVolume: Number.parseFloat(formData.get("transactionVolume")?.toString() || "0"),
        commissionRate: Number.parseFloat(formData.get("commissionRate")?.toString() || "0"),
        description: formData.get("description")?.toString() || "",
        notes: formData.get("notes")?.toString() || "",
        status: formData.get("status")?.toString() || "paid",
        createdBy: formData.get("createdBy")?.toString() || "system",
        createdByName: formData.get("createdByName")?.toString() || "System User",
        branchId: formData.get("branchId")?.toString() || "",
        branchName: formData.get("branchName")?.toString() || "",
      }

      // Handle file upload
      const receiptFile = formData.get("receipt") as File
      if (receiptFile && receiptFile.size > 0) {
        data.receiptUrl = `/uploads/receipts/${data.reference}-${receiptFile.name}`
        console.log("Receipt file uploaded:", receiptFile.name, receiptFile.size)
      }
    } else {
      // Handle JSON data
      data = await request.json()
    }

    console.log("Processed commission data:", data)

    // Validate required fields
    if (!data.source || !data.sourceName || !data.reference || !data.month) {
      throw new Error("Missing required fields: source, sourceName, reference, month")
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error("Amount must be greater than 0")
    }

    // Generate proper UUID for commission ID
    const id = crypto.randomUUID()

    // Insert commission
    const result = await sql`
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
        receipt_url,
        created_at,
        updated_at
      ) VALUES (
        ${id}::UUID,
        ${data.source},
        ${data.sourceName},
        ${data.reference},
        ${data.month},
        ${data.amount},
        ${data.transactionVolume || 0},
        ${data.commissionRate || 0},
        ${data.description || ""},
        ${data.notes || ""},
        ${data.status || "paid"},
        ${data.createdBy || "system"},
        ${data.createdByName || "System User"},
        ${data.branchId || "default-branch"},
        ${data.branchName || "Default Branch"},
        ${data.receiptUrl || null},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log("Commission created successfully:", result[0])

    return NextResponse.json({
      success: true,
      commission: result[0],
      message: "Commission created successfully",
    })
  } catch (error) {
    console.error("Error creating commission:", error)

    return NextResponse.json(
      {
        error: "Failed to create commission",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    )
  }
}
