import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { logger, LogCategory } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    const serviceType = searchParams.get("serviceType")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    await logger.info(LogCategory.API, "Real-time transactions request", {
      branchId,
      serviceType,
      status,
      limit,
    })

    // Build the query to union all transaction tables
    let query = `
      SELECT 
        id,
        type,
        'momo' as service_type,
        amount,
        fee,
        status,
        customer_name,
        phone_number,
        reference,
        date as created_at,
        date as updated_at,
        branch_id,
        processed_by,
        provider
      FROM momo_transactions 
      WHERE branch_id = $1
      
      UNION ALL
      
      SELECT 
        id,
        type,
        'agency_banking' as service_type,
        amount,
        fee,
        status,
        customer_name,
        account_number as phone_number,
        reference,
        date as created_at,
        date as updated_at,
        branch_id,
        processed_by,
        bank_name as provider
      FROM agency_banking_transactions 
      WHERE branch_id = $1
      
      UNION ALL
      
      SELECT 
        id,
        'withdrawal' as type,
        'e_zwich' as service_type,
        amount,
        fee_charged as fee,
        status,
        customer_name,
        card_number as phone_number,
        reference,
        date as created_at,
        date as updated_at,
        branch_id,
        processed_by,
        'e_zwich' as provider
      FROM e_zwich_withdrawals 
      WHERE branch_id = $1
      
      UNION ALL
      
      SELECT 
        id,
        type,
        'power' as service_type,
        amount,
        fee,
        status,
        customer_name,
        meter_number as phone_number,
        reference,
        date as created_at,
        date as updated_at,
        branch_id,
        processed_by,
        provider
      FROM power_transactions 
      WHERE branch_id = $1
    `

    const params: any[] = [branchId]
    let paramIndex = 1

    // Add service type filter if specified
    if (serviceType) {
      const serviceTypeFilter = serviceType.toLowerCase()
      if (serviceTypeFilter === 'momo') {
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
      } else if (serviceTypeFilter === 'agency_banking') {
        query = query.replace(/SELECT[\s\S]*?FROM momo_transactions[\s\S]*?UNION ALL/g, '')
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
      } else if (serviceTypeFilter === 'e_zwich') {
        query = query.replace(/SELECT[\s\S]*?FROM momo_transactions[\s\S]*?UNION ALL/g, '')
        query = query.replace(/SELECT[\s\S]*?FROM agency_banking_transactions[\s\S]*?UNION ALL/g, '')
        query = query.replace(/UNION ALL[\s\S]*?WHERE branch_id = \$\d+/g, '')
      } else if (serviceTypeFilter === 'power') {
        query = query.replace(/SELECT[\s\S]*?FROM momo_transactions[\s\S]*?UNION ALL/g, '')
        query = query.replace(/SELECT[\s\S]*?FROM agency_banking_transactions[\s\S]*?UNION ALL/g, '')
        query = query.replace(/SELECT[\s\S]*?FROM e_zwich_withdrawals[\s\S]*?UNION ALL/g, '')
      }
    }

    // Add status filter if specified
    if (status) {
      paramIndex++
      query += ` AND status = $${paramIndex}`
      params.push(status)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex + 1}`
    params.push(limit)

    const transactions = await sql.query(query, params)

    await logger.info(LogCategory.API, "Real-time transactions fetched successfully", {
      branchId,
      count: transactions.length,
    })

    return NextResponse.json({
      success: true,
      transactions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    await logger.error(LogCategory.API, "Real-time transactions fetch failed", error as Error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
} 