import type { AuditLogEntry } from "@/lib/audit-logger"

// Helper functions to generate random data
function generateRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
}

function generateRandomDate(daysBack = 30) {
  const now = new Date()
  const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  return new Date(pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime())).toISOString()
}

function generateTransactionId() {
  return `TXN${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`
}

// Mock audit log entries
export const mockAuditLogs: AuditLogEntry[] = [
  // Authentication events
  {
    id: "log_1",
    userId: "user_001",
    username: "admin",
    actionType: "login",
    entityType: "auth",
    entityId: "session_123456",
    description: "User login successful",
    timestamp: generateRandomDate(1),
    ipAddress: generateRandomIP(),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    severity: "low",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      loginMethod: "password",
      deviceType: "desktop",
    },
  },
  {
    id: "log_2",
    userId: "user_002",
    username: "finance_manager",
    actionType: "failed_login_attempt",
    entityType: "auth",
    entityId: "session_attempt_789012",
    description: "Failed login attempt",
    timestamp: generateRandomDate(1),
    ipAddress: generateRandomIP(),
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    severity: "medium",
    status: "failure",
    branchId: "branch_002",
    branchName: "Downtown Branch",
    details: {
      reason: "Invalid password",
      attemptCount: 2,
    },
    errorMessage: "Invalid credentials provided",
  },
  {
    id: "log_3",
    userId: "user_001",
    username: "admin",
    actionType: "logout",
    entityType: "auth",
    entityId: "session_123456",
    description: "User logout",
    timestamp: generateRandomDate(1),
    ipAddress: generateRandomIP(),
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    severity: "low",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
  },

  // Transaction events
  {
    id: "log_4",
    userId: "user_003",
    username: "cashier_1",
    actionType: "transaction_deposit",
    entityType: "transaction",
    entityId: generateTransactionId(),
    description: "Cash deposit transaction",
    timestamp: generateRandomDate(2),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_003",
    branchName: "Westside Branch",
    details: {
      amount: 5000.0,
      currency: "GHS",
      customerName: "John Doe",
      accountNumber: "1234567890",
      transactionType: "deposit",
    },
  },
  {
    id: "log_5",
    userId: "user_004",
    username: "teller_2",
    actionType: "transaction_withdrawal",
    entityType: "transaction",
    entityId: generateTransactionId(),
    description: "Cash withdrawal transaction",
    timestamp: generateRandomDate(3),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_002",
    branchName: "Downtown Branch",
    details: {
      amount: 2000.0,
      currency: "GHS",
      customerName: "Jane Smith",
      accountNumber: "0987654321",
      transactionType: "withdrawal",
    },
  },
  {
    id: "log_6",
    userId: "user_005",
    username: "supervisor_1",
    actionType: "transaction_approval",
    entityType: "transaction",
    entityId: generateTransactionId(),
    description: "Large transaction approval",
    timestamp: generateRandomDate(4),
    ipAddress: generateRandomIP(),
    severity: "high",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      amount: 50000.0,
      currency: "GHS",
      customerName: "Corporate Client Ltd",
      accountNumber: "5555555555",
      transactionType: "transfer",
      approvalReason: "Amount exceeds standard limit",
    },
  },

  // Float management events
  {
    id: "log_7",
    userId: "user_006",
    username: "float_manager",
    actionType: "float_addition",
    entityType: "float_account",
    entityId: "float_acc_001",
    description: "Float account balance increased",
    timestamp: generateRandomDate(5),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_003",
    branchName: "Westside Branch",
    details: {
      amount: 100000.0,
      currency: "GHS",
      previousBalance: 50000.0,
      newBalance: 150000.0,
      floatType: "MoMo",
      provider: "MTN",
    },
  },
  {
    id: "log_8",
    userId: "user_006",
    username: "float_manager",
    actionType: "float_allocation",
    entityType: "float_account",
    entityId: "float_acc_002",
    description: "Float allocated to branch",
    timestamp: generateRandomDate(6),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_002",
    branchName: "Downtown Branch",
    details: {
      amount: 25000.0,
      currency: "GHS",
      sourceAccount: "main_float_pool",
      destinationAccount: "branch_float_002",
      floatType: "E-Zwich",
      allocationReason: "Weekly allocation",
    },
  },
  {
    id: "log_9",
    userId: "user_007",
    username: "reconciliation_officer",
    actionType: "float_reconciliation",
    entityType: "float_account",
    entityId: "float_acc_003",
    description: "Float account reconciled",
    timestamp: generateRandomDate(7),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      expectedBalance: 75000.0,
      actualBalance: 74850.0,
      discrepancy: -150.0,
      currency: "GHS",
      floatType: "Vodafone Cash",
      reconciliationPeriod: "May 2023",
    },
  },

  // Export events
  {
    id: "log_10",
    userId: "user_001",
    username: "admin",
    actionType: "export_report",
    entityType: "report",
    entityId: "report_monthly_transactions",
    description: "Monthly transaction report exported",
    timestamp: generateRandomDate(8),
    ipAddress: generateRandomIP(),
    severity: "low",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      reportType: "Monthly Transactions",
      format: "CSV",
      period: "April 2023",
      recordCount: 1250,
      fileSize: "2.4MB",
    },
  },
  {
    id: "log_11",
    userId: "user_008",
    username: "finance_director",
    actionType: "export_data",
    entityType: "financial_data",
    entityId: "quarterly_financials",
    description: "Quarterly financial data exported",
    timestamp: generateRandomDate(9),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      dataType: "Quarterly Financials",
      format: "Excel",
      period: "Q1 2023",
      sheets: ["Income Statement", "Balance Sheet", "Cash Flow"],
      fileSize: "4.8MB",
    },
  },

  // System configuration events
  {
    id: "log_12",
    userId: "user_001",
    username: "admin",
    actionType: "update",
    entityType: "system_config",
    entityId: "transaction_limits",
    description: "Transaction limits updated",
    timestamp: generateRandomDate(10),
    ipAddress: generateRandomIP(),
    severity: "high",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      changes: {
        dailyWithdrawalLimit: {
          old: 10000.0,
          new: 15000.0,
        },
        singleTransactionLimit: {
          old: 5000.0,
          new: 7500.0,
        },
      },
      reason: "Policy update",
    },
  },
  {
    id: "log_13",
    userId: "user_001",
    username: "admin",
    actionType: "create",
    entityType: "user",
    entityId: "user_010",
    description: "New user created",
    timestamp: generateRandomDate(11),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      newUser: {
        username: "new_branch_manager",
        role: "Branch Manager",
        branch: "Eastside Branch",
        email: "manager@example.com",
      },
    },
  },

  // Critical events
  {
    id: "log_14",
    userId: "user_001",
    username: "admin",
    actionType: "update",
    entityType: "user",
    entityId: "user_002",
    description: "User role changed to Administrator",
    timestamp: generateRandomDate(12),
    ipAddress: generateRandomIP(),
    severity: "critical",
    status: "success",
    branchId: "branch_001",
    branchName: "Head Office",
    details: {
      changes: {
        role: {
          old: "Finance Manager",
          new: "Administrator",
        },
        permissions: {
          added: ["system_config", "user_management", "all_branches_access"],
        },
      },
      approvedBy: "user_001",
    },
  },
  {
    id: "log_15",
    userId: "system",
    username: "system",
    actionType: "system_error",
    entityType: "system",
    entityId: "database_connection",
    description: "Database connection failure",
    timestamp: generateRandomDate(13),
    ipAddress: "127.0.0.1",
    severity: "critical",
    status: "failure",
    details: {
      errorCode: "DB_CONN_TIMEOUT",
      component: "Database Server",
      attempts: 3,
      downtime: "00:05:23",
    },
    errorMessage: "Connection to database timed out after 30 seconds",
  },

  // Add more varied logs
  {
    id: "log_16",
    userId: "user_009",
    username: "branch_manager",
    actionType: "view",
    entityType: "report",
    entityId: "sensitive_customer_data",
    description: "Viewed sensitive customer data report",
    timestamp: generateRandomDate(14),
    ipAddress: generateRandomIP(),
    severity: "high",
    status: "success",
    branchId: "branch_004",
    branchName: "Eastside Branch",
    details: {
      reportType: "Customer PII Data",
      accessReason: "Audit requirement",
      recordsAccessed: 47,
    },
  },
  {
    id: "log_17",
    userId: "user_003",
    username: "cashier_1",
    actionType: "transaction_reversal",
    entityType: "transaction",
    entityId: generateTransactionId(),
    description: "Transaction reversal processed",
    timestamp: generateRandomDate(15),
    ipAddress: generateRandomIP(),
    severity: "medium",
    status: "success",
    branchId: "branch_003",
    branchName: "Westside Branch",
    details: {
      originalTransaction: generateTransactionId(),
      amount: 1200.0,
      currency: "GHS",
      customerName: "Michael Johnson",
      reversalReason: "Customer request - wrong recipient",
    },
  },
]

// Generate more random logs to have a substantial dataset
for (let i = 0; i < 50; i++) {
  const actionTypes = [
    "login",
    "logout",
    "transaction_deposit",
    "transaction_withdrawal",
    "transaction_transfer",
    "float_addition",
    "float_withdrawal",
    "float_allocation",
    "export_report",
    "export_data",
    "create",
    "update",
    "delete",
    "view",
  ]

  const entityTypes = [
    "auth",
    "transaction",
    "float_account",
    "report",
    "user",
    "system_config",
    "financial_data",
    "branch",
  ]

  const severities = ["low", "medium", "high", "critical"]
  const statuses = ["success", "failure"]

  const userIds = [
    "user_001",
    "user_002",
    "user_003",
    "user_004",
    "user_005",
    "user_006",
    "user_007",
    "user_008",
    "user_009",
  ]
  const usernames = [
    "admin",
    "finance_manager",
    "cashier_1",
    "teller_2",
    "supervisor_1",
    "float_manager",
    "reconciliation_officer",
    "finance_director",
    "branch_manager",
  ]

  const branchIds = ["branch_001", "branch_002", "branch_003", "branch_004"]
  const branchNames = ["Head Office", "Downtown Branch", "Westside Branch", "Eastside Branch"]

  const randomUserIndex = Math.floor(Math.random() * userIds.length)
  const randomBranchIndex = Math.floor(Math.random() * branchIds.length)
  const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)]
  const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)]
  const severity = severities[Math.floor(Math.random() * severities.length)]
  const status = statuses[Math.floor(Math.random() * statuses.length)]

  let description = ""
  let details: any = {}

  switch (actionType) {
    case "login":
      description = "User login successful"
      details = { loginMethod: "password", deviceType: ["desktop", "mobile", "tablet"][Math.floor(Math.random() * 3)] }
      break
    case "logout":
      description = "User logout"
      break
    case "transaction_deposit":
      description = "Cash deposit transaction"
      details = {
        amount: Math.floor(Math.random() * 10000) / 100,
        currency: "GHS",
        customerName: ["John Doe", "Jane Smith", "Michael Johnson", "Sarah Williams"][Math.floor(Math.random() * 4)],
        transactionType: "deposit",
      }
      break
    case "transaction_withdrawal":
      description = "Cash withdrawal transaction"
      details = {
        amount: Math.floor(Math.random() * 10000) / 100,
        currency: "GHS",
        customerName: ["John Doe", "Jane Smith", "Michael Johnson", "Sarah Williams"][Math.floor(Math.random() * 4)],
        transactionType: "withdrawal",
      }
      break
    case "float_addition":
      description = "Float account balance increased"
      const previousBalance = Math.floor(Math.random() * 100000) / 100
      const addAmount = Math.floor(Math.random() * 50000) / 100
      details = {
        amount: addAmount,
        currency: "GHS",
        previousBalance: previousBalance,
        newBalance: previousBalance + addAmount,
        floatType: ["MoMo", "E-Zwich", "Vodafone Cash", "Airtel-Tigo Money"][Math.floor(Math.random() * 4)],
      }
      break
    case "export_report":
      description = "Report exported"
      details = {
        reportType: ["Transactions", "Float Balances", "User Activity", "Commissions"][Math.floor(Math.random() * 4)],
        format: ["CSV", "PDF", "Excel"][Math.floor(Math.random() * 3)],
        recordCount: Math.floor(Math.random() * 1000) + 100,
      }
      break
    default:
      description = `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} operation on ${entityType.replace("_", " ")}`
  }

  mockAuditLogs.push({
    id: `log_${18 + i}`,
    userId: userIds[randomUserIndex],
    username: usernames[randomUserIndex],
    actionType: actionType,
    entityType: entityType,
    entityId:
      entityType === "transaction" ? generateTransactionId() : `${entityType}_${Math.floor(Math.random() * 1000)}`,
    description: description,
    timestamp: generateRandomDate(Math.floor(Math.random() * 30)),
    ipAddress: generateRandomIP(),
    severity: severity,
    status: status,
    branchId: branchIds[randomBranchIndex],
    branchName: branchNames[randomBranchIndex],
    details: details,
    ...(status === "failure" ? { errorMessage: "Operation failed due to an error" } : {}),
  })
}

// Sort by timestamp (newest first)
mockAuditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

// Function to get paginated logs
export function getPaginatedMockLogs(params: any) {
  let filteredLogs = [...mockAuditLogs]

  // Apply filters
  if (params.userId) {
    const userIds = Array.isArray(params.userId) ? params.userId : [params.userId]
    filteredLogs = filteredLogs.filter((log) => userIds.includes(log.userId))
  }

  if (params.actionType) {
    const actionTypes = Array.isArray(params.actionType) ? params.actionType : params.actionType.split(",")
    filteredLogs = filteredLogs.filter((log) => actionTypes.includes(log.actionType))
  }

  if (params.entityType) {
    const entityTypes = Array.isArray(params.entityType) ? params.entityType : params.entityType.split(",")
    filteredLogs = filteredLogs.filter((log) => entityTypes.includes(log.entityType))
  }

  if (params.entityId) {
    filteredLogs = filteredLogs.filter((log) => log.entityId === params.entityId)
  }

  if (params.startDate) {
    const startDate = new Date(params.startDate).getTime()
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() >= startDate)
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate).getTime()
    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() <= endDate)
  }

  if (params.severity) {
    const severities = Array.isArray(params.severity) ? params.severity : params.severity.split(",")
    filteredLogs = filteredLogs.filter((log) => severities.includes(log.severity))
  }

  if (params.branchId) {
    const branchIds = Array.isArray(params.branchId) ? params.branchId : params.branchId.split(",")
    filteredLogs = filteredLogs.filter((log) => log.branchId && branchIds.includes(log.branchId))
  }

  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : params.status.split(",")
    filteredLogs = filteredLogs.filter((log) => statuses.includes(log.status))
  }

  if (params.searchTerm) {
    const searchTerm = params.searchTerm.toLowerCase()
    filteredLogs = filteredLogs.filter(
      (log) =>
        (log.username && log.username.toLowerCase().includes(searchTerm)) ||
        (log.description && log.description.toLowerCase().includes(searchTerm)) ||
        (log.entityId && log.entityId.toLowerCase().includes(searchTerm)) ||
        (log.branchName && log.branchName.toLowerCase().includes(searchTerm)),
    )
  }

  // Get total count before pagination
  const total = filteredLogs.length

  // Apply pagination
  const offset = params.offset || 0
  const limit = params.limit || 25

  const paginatedLogs = filteredLogs.slice(offset, offset + limit)

  return {
    logs: paginatedLogs,
    total: total,
  }
}
