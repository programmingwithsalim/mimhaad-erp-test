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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { FloatType } from "@/lib/float-types-store"

interface AddProviderDialogProps {
  floatTypes: FloatType[]
  onAddProvider: (provider: { typeId: string; id: string; name: string }) => void
}

export function AddProviderDialog({ floatTypes, onAddProvider }: AddProviderDialogProps) {
  const [open, setOpen] = useState(false)
  const [typeId, setTypeId] = useState("")
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!typeId) {
      toast({
        title: "Missing Type",
        description: "Please select a float type.",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter a name for the provider.",
        variant: "destructive",
      })
      return
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/\s+/g, "-")

    // Check if provider already exists
    const floatType = floatTypes.find((t) => t.id === typeId)
    if (floatType && floatType.providers.some((p) => p.id === id)) {
      toast({
        title: "Provider Already Exists",
        description: `${name} already exists for ${floatType.name}.`,
        variant: "destructive",
      })
      return
    }

    // Call the onAddProvider callback
    onAddProvider({
      typeId,
      id,
      name,
    })

    // Reset form and close dialog
    setTypeId("")
    setName("")
    setOpen(false)

    // Show success message
    toast({
      title: "Provider Added",
      description: `${name} has been added as a new provider.`,
    })
  }

  // Filter out types that don't need providers
  const eligibleTypes = floatTypes.filter((type) => type.id !== "cash-in-till" && type.id !== "ezwich")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>Add a new provider for a float account type.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="col-span-4">
                Float Type
              </Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger id="type" className="col-span-4">
                  <SelectValue placeholder="Select float type" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="col-span-4">
                Provider Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Bank"
                className="col-span-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Provider</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
