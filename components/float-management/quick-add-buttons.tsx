"use client"
import { AddFloatTypeDialog } from "./add-float-type-dialog"
import { AddProviderDialog } from "./add-provider-dialog"
import { useFloatTypesStore } from "@/lib/float-types-store"

interface QuickAddButtonsProps {
  onAddType: (type: { id: string; name: string; minThreshold: number; maxThreshold: number }) => void
  onAddProvider: (provider: { typeId: string; id: string; name: string }) => void
}

export function QuickAddButtons({ onAddType, onAddProvider }: QuickAddButtonsProps) {
  const { types } = useFloatTypesStore()

  return (
    <div className="flex gap-2">
      <AddFloatTypeDialog onAddType={onAddType} />
      <AddProviderDialog floatTypes={types} onAddProvider={onAddProvider} />
    </div>
  )
}
