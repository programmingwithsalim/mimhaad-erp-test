"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Eye } from "lucide-react"

interface CommissionReceiptViewerProps {
  commissionId: string
  reference: string
  receiptUrl?: string
}

export function CommissionReceiptViewer({ commissionId, reference, receiptUrl }: CommissionReceiptViewerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleViewReceipt = async () => {
    if (receiptUrl) {
      // If we have a direct URL, open it
      window.open(receiptUrl, "_blank")
      return
    }

    // Otherwise, fetch from API
    setIsLoading(true)
    try {
      const response = await fetch(`/api/commissions/${commissionId}/receipt`)
      const result = await response.json()

      if (result.success && result.receiptUrl) {
        window.open(result.receiptUrl, "_blank")
      } else {
        toast({
          title: "No Receipt Found",
          description: "No receipt is available for this commission",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching receipt:", error)
      toast({
        title: "Error",
        description: "Failed to load receipt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReceipt = async () => {
    if (receiptUrl) {
      // Create a download link
      const link = document.createElement("a")
      link.href = receiptUrl
      link.download = `${reference}-receipt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // Otherwise, fetch from API
    setIsLoading(true)
    try {
      const response = await fetch(`/api/commissions/${commissionId}/receipt`)
      const result = await response.json()

      if (result.success && result.receiptUrl) {
        const link = document.createElement("a")
        link.href = result.receiptUrl
        link.download = result.filename || `${reference}-receipt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: "Download Started",
          description: "Receipt download has started",
        })
      } else {
        toast({
          title: "No Receipt Found",
          description: "No receipt is available for this commission",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error downloading receipt:", error)
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!receiptUrl && !commissionId) {
    return <span className="text-sm text-muted-foreground">No receipt available</span>
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleViewReceipt} disabled={isLoading}>
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
      <Button variant="outline" size="sm" onClick={handleDownloadReceipt} disabled={isLoading}>
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>
    </div>
  )
}
