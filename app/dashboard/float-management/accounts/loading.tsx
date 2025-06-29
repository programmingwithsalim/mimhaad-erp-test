import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function FloatAccountsLoading() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Float Accounts</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Float Accounts</CardTitle>
          <Skeleton className="h-10 w-[120px]" />
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-[200px]" />
              <Skeleton className="h-10 w-[200px]" />
              <Skeleton className="h-10 w-[100px] ml-auto" />
            </div>
          </div>

          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading float accounts...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
