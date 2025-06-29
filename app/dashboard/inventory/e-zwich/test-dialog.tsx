"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function TestDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            console.log("Test dialog button clicked")
            setOpen(true)
          }}
        >
          Test Dialog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog to verify dialog functionality</DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <p>If you can see this, the dialog is working!</p>
          <Button onClick={() => setOpen(false)} className="mt-4">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
