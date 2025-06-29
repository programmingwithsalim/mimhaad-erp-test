"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AddFloatTypeDialogProps {
  onAddType: (type: { id: string; name: string; minThreshold: number; maxThreshold: number }) => void
}

export function AddFloatTypeDialog({ onAddType }: AddFloatTypeDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [minThreshold, setMinThreshold] = useState("5000")
  const [maxThreshold, setMaxThreshold] = useState("50000")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the float type.",
        variant: "destructive",
      })
      return
    }

    const min = Number.parseFloat(minThreshold)
    const max = Number.parseFloat(maxThreshold)

    if (isNaN(min) || min < 0) {
      toast({
        title: "Invalid Minimum Threshold",
        description: "Minimum threshold must be a positive number.",
        variant: "destructive",
      })
      return
    }

    if (isNaN(max) || max < 0) {
      toast({
        title: "Invalid Maximum Threshold",
        description: "Maximum threshold must be a positive number.",
        variant: "destructive",
      })
      return
    }

    if (min >= max) {
      toast({
        title: "Invalid Thresholds",
        description: "Minimum threshold must be less than maximum threshold.",
        variant: "destructive",
      })
      return
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/\s+/g, "-")

    // Call the onAddType callback
    onAddType({
      id,
      name,
      minThreshold: min,
      maxThreshold: max,
    })

    // Reset form and close dialog
    setName("")
    setMinThreshold("5000")
    setMaxThreshold("50000")
    setOpen(false)

    // Show success message
    toast({
      title: "Float Type Added",
      description: `${name} has been added as a new float type.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Type
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Float Type</DialogTitle>
            <DialogDescription>Create a new type of float account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-4">
                Type Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Utility Payments"
                className="col-span-4"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minThreshold" className="col-span-4">
                Minimum Threshold (GHS)
              </Label>
              <Input
                id="minThreshold"
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                placeholder="0.00"
                className="col-span-4"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxThreshold" className="col-span-4">
                Maximum Threshold (GHS)
              </Label>
              <Input
                id="maxThreshold"
                type="number"
                value={maxThreshold}
                onChange={(e) => setMaxThreshold(e.target.value)}
                placeholder="0.00"
                className="col-span-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Float Type</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
