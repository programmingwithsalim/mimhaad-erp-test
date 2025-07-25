"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateExpensePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main expenses page
    router.replace("/dashboard/expenses");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to expenses page...</p>
      </div>
    </div>
  );
}
