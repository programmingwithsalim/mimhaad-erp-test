"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, Filter, Download, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JumiaPackage {
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_phone?: string;
  branch_id: string;
  user_id: string;
  status: "received" | "delivered" | "settled";
  received_at: string;
  delivered_at?: string;
  settled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function JumiaPackagesPage() {
  const { user } = useCurrentUser();
  const [packages, setPackages] = useState<JumiaPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPackages, setTotalPackages] = useState(0);
  const [itemsPerPage] = useState(20);

  // Package creation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<JumiaPackage | null>(
    null
  );
  const [packageForm, setPackageForm] = useState({
    tracking_id: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchPackages();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        branchId: user?.branchId || "",
      });

      const response = await fetch(`/api/jumia/packages?${params}`);
      const data = await response.json();

      if (data.success) {
        setPackages(data.data || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
        setTotalPackages(data.total || 0);
      } else {
        console.log("No packages found");
        setPackages([]);
        setTotalPages(1);
        setTotalPackages(0);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
      setPackages([]);
      setTotalPages(1);
      setTotalPackages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageForm.tracking_id || !packageForm.customer_name) {
      toast({
        title: "Error",
        description: "Tracking ID and Customer Name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingPackage(true);

      const response = await fetch("/api/jumia/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracking_id: packageForm.tracking_id,
          customer_name: packageForm.customer_name,
          customer_phone: packageForm.customer_phone,
          notes: packageForm.notes,
          branch_id: user?.branchId,
          user_id: user?.id,
          status: "received",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Package Received",
          description: `Package with tracking ID ${packageForm.tracking_id} has been received from Jumia and is ready for pickup.`,
        });
        setIsCreateDialogOpen(false);
        setPackageForm({
          tracking_id: "",
          customer_name: "",
          customer_phone: "",
          notes: "",
        });
        fetchPackages(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create package",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating package:", error);
      toast({
        title: "Error",
        description: "Failed to create package",
        variant: "destructive",
      });
    } finally {
      setCreatingPackage(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!packageToDelete) return;

    try {
      setDeletingPackage(true);
      const response = await fetch(
        `/api/jumia/packages/${packageToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Package Deleted",
          description: `Package with tracking ID ${packageToDelete.tracking_id} has been deleted successfully.`,
        });
        setIsDeleteDialogOpen(false);
        setPackageToDelete(null);
        fetchPackages(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete package",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting package:", error);
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      });
    } finally {
      setDeletingPackage(false);
    }
  };

  const confirmDelete = (pkg: JumiaPackage) => {
    setPackageToDelete(pkg);
    setIsDeleteDialogOpen(true);
  };

  const resetPackageForm = () => {
    setPackageForm({
      tracking_id: "",
      customer_name: "",
      customer_phone: "",
      notes: "",
    });
  };

  const exportPackages = () => {
    // Export functionality
    const csvContent = [
      ["Date", "Customer", "Phone", "Tracking ID", "Status", "Notes"],
      ...packages.map((pkg) => [
        new Date(pkg.created_at).toLocaleDateString(),
        pkg.customer_name,
        pkg.customer_phone || "N/A",
        pkg.tracking_id,
        pkg.status,
        pkg.notes || "No notes",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jumia-packages-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { variant: "secondary" as const, text: "Received" },
      delivered: { variant: "default" as const, text: "Delivered" },
      settled: { variant: "outline" as const, text: "Settled" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: "outline" as const,
      text: status,
    };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      package_receipt: { variant: "default" as const, text: "Package Receipt" },
      pod_collection: { variant: "secondary" as const, text: "POD Collection" },
      settlement: { variant: "outline" as const, text: "Settlement" },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || {
      variant: "outline" as const,
      text: type,
    };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jumia Packages</h1>
          <p className="text-muted-foreground">
            Manage and track Jumia package transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Package
          </Button>
          <Button onClick={exportPackages} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 w-full lg:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full lg:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {totalPackages} packages
            </div>
          </div>

          {/* Packages Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading packages...
                    </TableCell>
                  </TableRow>
                ) : packages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No packages found
                    </TableCell>
                  </TableRow>
                ) : (
                  packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        {new Date(pkg.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{pkg.customer_name}</TableCell>
                      <TableCell>{pkg.customer_phone || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {pkg.tracking_id}
                      </TableCell>
                      <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pkg.notes || "No notes"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDelete(pkg)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Package Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Package</DialogTitle>
            <DialogDescription>
              Enter the details for the new package receipt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePackage}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tracking_id" className="text-right">
                  Tracking ID
                </Label>
                <Input
                  id="tracking_id"
                  value={packageForm.tracking_id}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      tracking_id: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer_name" className="text-right">
                  Customer Name
                </Label>
                <Input
                  id="customer_name"
                  value={packageForm.customer_name}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      customer_name: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer_phone" className="text-right">
                  Customer Phone
                </Label>
                <Input
                  id="customer_phone"
                  value={packageForm.customer_phone}
                  onChange={(e) =>
                    setPackageForm({
                      ...packageForm,
                      customer_phone: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={packageForm.notes}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, notes: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <Button type="submit" disabled={creatingPackage}>
              {creatingPackage ? "Creating..." : "Create Package"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Package Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              package.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePackage}
              disabled={deletingPackage}
            >
              {deletingPackage ? "Deleting..." : "Delete Package"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
