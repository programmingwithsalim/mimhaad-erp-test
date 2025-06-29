import { NextResponse } from "next/server"
import { SettingsService } from "@/lib/settings-service"

export async function POST(request: Request) {
  try {
    const { amount, transactionType } = await request.json()

    if (!amount || !transactionType) {
      return NextResponse.json({ success: false, error: "Amount and transaction type are required" }, { status: 400 })
    }

    let fee = 0
    let feeType = "fixed"
    let minimumFee = null
    let maximumFee = null
    let feeSource = "fallback" // Default to fallback since we'll handle DB errors

    try {
      if (transactionType === "withdrawal") {
        // Try to get E-Zwich withdrawal fee configuration
        try {
          const feeConfig = await SettingsService.getFeeConfiguration("e_zwich_withdrawal")

          if (feeConfig && feeConfig.is_active) {
            feeType = feeConfig.fee_type

            if (feeConfig.fee_type === "percentage") {
              fee = (amount * feeConfig.fee_value) / 100
              minimumFee = feeConfig.minimum_fee
              maximumFee = feeConfig.maximum_fee

              // Apply minimum and maximum limits
              if (minimumFee && fee < minimumFee) {
                fee = minimumFee
              }
              if (maximumFee && fee > maximumFee) {
                fee = maximumFee
              }
            } else if (feeConfig.fee_type === "fixed") {
              fee = feeConfig.fee_value
            } else if (feeConfig.fee_type === "tiered") {
              // Implement tiered fee logic if needed
              fee = feeConfig.fee_value
            }

            feeSource = "database"
          } else {
            // Fallback to default calculation
            if (amount >= 100) {
              fee = Math.max(amount * 0.015, 1.5) // 1.5% with minimum of GHS 1.5
              fee = Math.min(fee, 50) // Maximum of GHS 50
              feeType = "percentage"
              minimumFee = 1.5
              maximumFee = 50
            } else {
              fee = 0 // Free for amounts below GHS 100
              feeType = "free"
            }
          }
        } catch (dbError) {
          console.error("Error fetching fee configuration from database:", dbError)
          // Fallback calculation for withdrawal
          if (amount >= 100) {
            fee = Math.max(amount * 0.015, 1.5) // 1.5% with minimum of GHS 1.5
            fee = Math.min(fee, 50) // Maximum of GHS 50
            feeType = "percentage"
            minimumFee = 1.5
            maximumFee = 50
          } else {
            fee = 0 // Free for amounts below GHS 100
            feeType = "free"
          }
        }
      } else if (transactionType === "card_issuance") {
        // Try to get E-Zwich card issuance fee configuration
        try {
          const feeConfig = await SettingsService.getFeeConfiguration("e_zwich_card_issuance")

          if (feeConfig && feeConfig.is_active) {
            fee = feeConfig.fee_value
            feeType = feeConfig.fee_type
            minimumFee = feeConfig.minimum_fee
            maximumFee = feeConfig.maximum_fee
            feeSource = "database"
          } else {
            // Fallback to default
            fee = 15.0 // Fixed fee for card issuance
            feeType = "fixed"
          }
        } catch (dbError) {
          console.error("Error fetching fee configuration from database:", dbError)
          // Fallback to default for card issuance
          fee = 15.0
          feeType = "fixed"
        }
      }
    } catch (error) {
      console.error("Error in fee calculation logic:", error)

      // Final fallback calculations
      if (transactionType === "withdrawal") {
        if (amount >= 100) {
          fee = Math.max(amount * 0.015, 1.5)
          fee = Math.min(fee, 50)
          feeType = "percentage"
          minimumFee = 1.5
          maximumFee = 50
        } else {
          fee = 0
          feeType = "free"
        }
      } else if (transactionType === "card_issuance") {
        fee = 15.0
        feeType = "fixed"
      }
    }

    return NextResponse.json({
      success: true,
      fee: Number(fee.toFixed(2)),
      feeType,
      minimumFee,
      maximumFee,
      feeSource,
      amount: Number(amount),
      transactionType,
    })
  } catch (error) {
    console.error("Error calculating E-Zwich fee:", error)
    return NextResponse.json({ success: false, error: "Failed to calculate fee" }, { status: 500 })
  }
}
