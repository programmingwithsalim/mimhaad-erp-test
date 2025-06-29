"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EZwichAddStockFormSimple } from "./e-zwich-add-stock-form-simple"

interface EZwichAddStockDialogProps {
  onSuccess?: () => void
}

export function EZwichAddStockDialog({ onSuccess }: EZwichAddStockDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    if (onSuccess) {
      onSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add E-Zwich Card Stock</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Add new E-Zwich card stock to your inventory. Batch codes will be auto-generated.
          </div>
        </DialogHeader>
        <EZwichAddStockFormSimple onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
