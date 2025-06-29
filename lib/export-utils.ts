export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error("No data to export")
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    headers.join(","), // Header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Handle values that might contain commas or quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value || ""
        })
        .join(","),
    ),
  ].join("\n")

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const formatTransactionForExport = (transaction: any) => {
  return {
    "Transaction ID": transaction.id,
    Date: new Date(transaction.date).toLocaleDateString(),
    "Customer Name": transaction.customer_name || transaction.customerName,
    "Phone/Account": transaction.phone_number || transaction.phoneNumber || transaction.account_number,
    Type: transaction.type,
    "Provider/Bank": transaction.provider || transaction.partner_bank,
    Amount: transaction.amount,
    Fee: transaction.fee,
    Status: transaction.status,
    Reference: transaction.reference || "",
    Branch: transaction.branch_name || transaction.branchName || "",
    "Processed By": transaction.processed_by || transaction.username || "",
  }
}
