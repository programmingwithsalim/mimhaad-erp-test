import { ExpenseEntryForm } from "@/components/expenses/expense-entry-form"

export default function CreateExpensePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="mb-6 text-3xl font-bold">Create New Expense</h1>
      <ExpenseEntryForm />
    </div>
  )
}
