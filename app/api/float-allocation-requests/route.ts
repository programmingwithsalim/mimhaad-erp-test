import { NextResponse } from "next/server"
import { readJsonFile, writeJsonFile, fileExists } from "@/lib/file-utils"
import { v4 as uuidv4 } from "uuid"

// Path to the float allocation requests JSON file
const FLOAT_ALLOCATION_REQUESTS_FILE_PATH = "data/float-allocation-requests.json"

// Initialize the file if it doesn't exist
async function initFloatAllocationRequestsFile() {
  try {
    const exists = await fileExists(FLOAT_ALLOCATION_REQUESTS_FILE_PATH)
    if (!exists) {
      await writeJsonFile(FLOAT_ALLOCATION_REQUESTS_FILE_PATH, {
        requests: [],
      })
    }
    return true
  } catch (error) {
    console.error("Error initializing float allocation requests file:", error)
    return false
  }
}

export async function GET(request: Request) {
  try {
    // Initialize the file if needed
    await initFloatAllocationRequestsFile()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const branchId = searchParams.get("branchId")
    const status = searchParams.get("status")

    // Read the float allocation requests data
    const data = await readJsonFile(FLOAT_ALLOCATION_REQUESTS_FILE_PATH)
    const requests = data.requests || []

    // Filter requests based on query parameters
    let filteredRequests = requests

    if (accountId) {
      filteredRequests = filteredRequests.filter((req: any) => req.accountId === accountId)
    }

    if (branchId) {
      filteredRequests = filteredRequests.filter((req: any) => req.branchId === branchId)
    }

    if (status) {
      filteredRequests = filteredRequests.filter((req: any) => req.status === status)
    }

    // Sort requests by timestamp (newest first)
    filteredRequests.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())

    return NextResponse.json({ requests: filteredRequests })
  } catch (error) {
    console.error("Error fetching float allocation requests:", error)
    return NextResponse.json({ error: "Failed to fetch float allocation requests" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Initialize the file if needed
    await initFloatAllocationRequestsFile()

    // Parse the request body
    const body = await request.json()
    const { accountId, branchId, amount, reason, urgency, requestedBy } = body

    // Validate required fields
    if (!accountId || !branchId || amount === undefined || !reason || !requestedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create the request
    const allocationRequest = {
      id: uuidv4(),
      accountId,
      branchId,
      amount,
      reason,
      urgency: urgency || "medium",
      status: "pending",
      requestedBy,
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      notes: "",
    }

    // Read the float allocation requests data
    const data = await readJsonFile(FLOAT_ALLOCATION_REQUESTS_FILE_PATH)
    const requests = data.requests || []

    // Add the new request
    requests.push(allocationRequest)

    // Save the updated requests
    await writeJsonFile(FLOAT_ALLOCATION_REQUESTS_FILE_PATH, { requests })

    return NextResponse.json({
      success: true,
      request: allocationRequest,
    })
  } catch (error) {
    console.error("Error creating float allocation request:", error)
    return NextResponse.json({ error: "Failed to create float allocation request" }, { status: 500 })
  }
}
