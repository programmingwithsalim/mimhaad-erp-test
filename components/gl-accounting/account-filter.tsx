"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Mock data for accounts
const accounts = [
  { value: "1001", label: "1001 - Cash in Bank - Operations" },
  { value: "1002", label: "1002 - Cash in Bank - Payroll" },
  { value: "1003", label: "1003 - Petty Cash" },
  { value: "1200", label: "1200 - Accounts Receivable" },
  { value: "2001", label: "2001 - Accounts Payable" },
  { value: "3001", label: "3001 - Share Capital" },
  { value: "4001", label: "4001 - MoMo Commission Revenue" },
  { value: "4002", label: "4002 - E-Zwich Commission Revenue" },
  { value: "5001", label: "5001 - Salaries Expense" },
  { value: "5002", label: "5002 - Rent Expense" },
]

interface AccountFilterProps {
  selectedAccount: string | null
  onAccountChange: (value: string | null) => void
}

export function AccountFilter({ selectedAccount, onAccountChange }: AccountFilterProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    if (value === "all") {
      onAccountChange(null)
    } else {
      onAccountChange(value === selectedAccount ? null : value)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
        >
          {selectedAccount ? accounts.find((account) => account.value === selectedAccount)?.label : "Select Account"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              <CommandItem key="all" value="all" onSelect={() => handleSelect("all")}>
                <Check className={cn("mr-2 h-4 w-4", !selectedAccount ? "opacity-100" : "opacity-0")} />
                All Accounts
              </CommandItem>
              {accounts.map((account) => (
                <CommandItem key={account.value} value={account.value} onSelect={() => handleSelect(account.value)}>
                  <Check
                    className={cn("mr-2 h-4 w-4", selectedAccount === account.value ? "opacity-100" : "opacity-0")}
                  />
                  {account.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
