import { EditFloatAccountForm } from "@/components/float-management/edit-float-account-form"

export default function EditFloatAccountPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Edit Float Account</h1>
      <EditFloatAccountForm accountId={params.id} />
    </div>
  )
}
