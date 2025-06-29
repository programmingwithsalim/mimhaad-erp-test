import { FloatAccountList } from "@/components/float-management/float-account-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FloatAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Float Accounts</h2>
        <Link href="/dashboard/float-management/accounts/create" passHref>
          <Button>New Float Account</Button>
        </Link>
      </div>
      <FloatAccountList />
    </div>
  )
}
