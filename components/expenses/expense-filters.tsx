"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExpenseHead } from "@/lib/expense-types"

interface ExpenseFiltersProps {
  expenseHeads: ExpenseHead[]
  initialFilters: Record<string, any>
  onApplyFilters: (filters: Record<string, any>) => void
  onClearFilters: () => void
}

export function ExpenseFilters({ expenseHeads, initialFilters, onApplyFilters, onClearFilters }: ExpenseFiltersProps) {
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters || {})

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch("/api/branches")
        const data = await response.json()
        setBranches(data || [])
      } catch (error) {
        console.error("Error fetching branches:", error)
      }
    }

    fetchBranches()
  }, [])

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({})
    onClearFilters()
  }

  // Handle apply filters
  const handleApplyFilters = () => {
    onApplyFilters(filters)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Branch Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Branch</label>
          <Select
            value={filters.branch_id || ""}
            onValueChange={(value) => handleFilterChange("branch_id", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expense Head Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Expense Category</label>
          <Select
            value={filters.expense_head_id || ""}
            onValueChange={(value) => handleFilterChange("expense_head_id", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseHeads.map((head) => (
                <SelectItem key={head.id} value={head.id}>
                  {head.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={filters.status || ""}
            onValueChange={(value) => handleFilterChange("status", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Source Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Source</label>
          <Select
            value={filters.payment_source || ""}
            onValueChange={(value) => handleFilterChange("payment_source", value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="cash">Cash in Till</SelectItem>
              <SelectItem value="momo">Mobile Money</SelectItem>
              <SelectItem value="bank">Bank Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.start_date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.start_date ? format(new Date(filters.start_date), "PPP") : "Select date"}
                {filters.start_date && (
                  <X
                    className="ml-auto h-4 w-4 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("start_date", undefined)
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.start_date ? new Date(filters.start_date) : undefined}
                onSelect={(date) => handleFilterChange("start_date", date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.end_date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.end_date ? format(new Date(filters.end_date), "PPP") : "Select date"}
                {filters.end_date && (
                  <X
                    className="ml-auto h-4 w-4 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("end_date", undefined)
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={filters.end_date ? new Date(filters.end_date) : undefined}
                onSelect={(date) => handleFilterChange("end_date", date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClearFilters}>
          Clear Filters
        </Button>
        <Button onClick={handleApplyFilters}>Apply Filters</Button>
      </div>
    </div>
  )
}
