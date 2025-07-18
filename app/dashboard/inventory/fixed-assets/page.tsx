"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Plus,
  Calculator,
  Building2,
  Calendar,
  DollarSign,
  TrendingDown,
  FileText,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";

interface FixedAsset {
  id: string;
  name: string;
  description: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: string;
  currentValue: number;
  accumulatedDepreciation: number;
  branchId: string;
  branchName: string;
  status: "active" | "disposed" | "under-maintenance";
  location: string;
  serialNumber?: string;
  supplier?: string;
  warrantyExpiry?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  createdAt: string;
  updatedAt: string;
}

interface DepreciationCalculation {
  year: number;
  beginningValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  endingValue: number;
}

export default function FixedAssetsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDepreciationDialog, setShowDepreciationDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [depreciationSchedule, setDepreciationSchedule] = useState<
    DepreciationCalculation[]
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    purchaseDate: "",
    purchaseCost: "",
    salvageValue: "",
    usefulLife: "",
    depreciationMethod: "straight-line",
    location: "",
    serialNumber: "",
    supplier: "",
    warrantyExpiry: "",
  });

  const assetCategories = [
    "Buildings",
    "Machinery & Equipment",
    "Vehicles",
    "Furniture & Fixtures",
    "Computer Equipment",
    "Office Equipment",
    "Land",
    "Intangible Assets",
    "Other",
  ];

  const depreciationMethods = [
    { value: "straight-line", label: "Straight Line" },
    { value: "declining-balance", label: "Declining Balance" },
    { value: "sum-of-years", label: "Sum of Years Digits" },
    { value: "units-of-production", label: "Units of Production" },
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fixed-assets");
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        throw new Error("Failed to fetch assets");
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch fixed assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDepreciation = (
    asset: FixedAsset
  ): DepreciationCalculation[] => {
    const schedule: DepreciationCalculation[] = [];
    const cost = asset.purchaseCost;
    const salvage = asset.salvageValue;
    const life = asset.usefulLife;
    let accumulatedDepreciation = 0;

    for (let year = 1; year <= life; year++) {
      let depreciationExpense = 0;

      switch (asset.depreciationMethod) {
        case "straight-line":
          depreciationExpense = (cost - salvage) / life;
          break;
        case "declining-balance":
          const rate = 2 / life; // Double declining balance
          depreciationExpense = (cost - accumulatedDepreciation) * rate;
          break;
        case "sum-of-years":
          const remainingLife = life - year + 1;
          const sumOfYears = (life * (life + 1)) / 2;
          depreciationExpense = ((cost - salvage) * remainingLife) / sumOfYears;
          break;
        default:
          depreciationExpense = (cost - salvage) / life;
      }

      // Ensure we don't depreciate below salvage value
      if (cost - accumulatedDepreciation - depreciationExpense < salvage) {
        depreciationExpense = cost - accumulatedDepreciation - salvage;
      }

      accumulatedDepreciation += depreciationExpense;

      schedule.push({
        year,
        beginningValue: cost - (accumulatedDepreciation - depreciationExpense),
        depreciationExpense,
        accumulatedDepreciation,
        endingValue: cost - accumulatedDepreciation,
      });
    }

    return schedule;
  };

  const handleAddAsset = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Asset name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.purchaseDate) {
      toast({
        title: "Validation Error",
        description: "Purchase date is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.purchaseCost || Number(formData.purchaseCost) <= 0) {
      toast({
        title: "Validation Error",
        description: "Purchase cost must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.usefulLife || Number(formData.usefulLife) <= 0) {
      toast({
        title: "Validation Error",
        description: "Useful life must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/fixed-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          purchaseCost: Number(formData.purchaseCost),
          salvageValue: Number(formData.salvageValue || 0),
          usefulLife: Number(formData.usefulLife),
          branchId: user?.branchId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Fixed asset added successfully",
        });
        setShowAddDialog(false);
        setFormData({
          name: "",
          description: "",
          category: "",
          purchaseDate: "",
          purchaseCost: "",
          salvageValue: "",
          usefulLife: "",
          depreciationMethod: "straight-line",
          location: "",
          serialNumber: "",
          supplier: "",
          warrantyExpiry: "",
        });
        fetchAssets();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add asset");
      }
    } catch (error) {
      console.error("Error adding asset:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add fixed asset",
        variant: "destructive",
      });
    }
  };

  const handleViewDepreciation = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    const schedule = calculateDepreciation(asset);
    setDepreciationSchedule(schedule);
    setShowDepreciationDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "disposed":
        return <Badge variant="destructive">Disposed</Badge>;
      case "under-maintenance":
        return <Badge variant="secondary">Under Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalAssets = assets.reduce(
    (sum, asset) => sum + asset.purchaseCost,
    0
  );
  const totalDepreciation = assets.reduce(
    (sum, asset) => sum + asset.accumulatedDepreciation,
    0
  );
  const netBookValue = totalAssets - totalDepreciation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Fixed Assets Register
          </h1>
          <p className="text-muted-foreground">
            Manage and track fixed assets with depreciation calculations
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Fixed Asset</DialogTitle>
              <DialogDescription>
                Enter the details of the fixed asset to add to the register.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Office Building"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description of the asset"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseCost">Purchase Cost (₵) *</Label>
                  <Input
                    id="purchaseCost"
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseCost: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="salvageValue">Salvage Value (₵) *</Label>
                  <Input
                    id="salvageValue"
                    type="number"
                    step="0.01"
                    value={formData.salvageValue}
                    onChange={(e) =>
                      setFormData({ ...formData, salvageValue: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="usefulLife">Useful Life (Years) *</Label>
                  <Input
                    id="usefulLife"
                    type="number"
                    value={formData.usefulLife}
                    onChange={(e) =>
                      setFormData({ ...formData, usefulLife: e.target.value })
                    }
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="depreciationMethod">
                    Depreciation Method *
                  </Label>
                  <Select
                    value={formData.depreciationMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, depreciationMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {depreciationMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g., Main Office, Floor 2"
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                    placeholder="SN123456789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier: e.target.value })
                    }
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="warrantyExpiry"
                    type="date"
                    value={formData.warrantyExpiry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        warrantyExpiry: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAsset}>Add Asset</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAssets)}
            </div>
            <p className="text-xs text-muted-foreground">
              {assets.length} assets registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accumulated Depreciation
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDepreciation)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total depreciation to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Book Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(netBookValue)}
            </div>
            <p className="text-xs text-muted-foreground">Current asset value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assets.filter((a) => a.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fixed Assets</CardTitle>
          <CardDescription>
            Complete list of all fixed assets with their current values
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading assets...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Cost</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Depreciation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {asset.serialNumber && `SN: ${asset.serialNumber}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>{formatCurrency(asset.purchaseCost)}</TableCell>
                    <TableCell>{formatCurrency(asset.currentValue)}</TableCell>
                    <TableCell>
                      {formatCurrency(asset.accumulatedDepreciation)}
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDepreciation(asset)}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Depreciation Schedule Dialog */}
      <Dialog
        open={showDepreciationDialog}
        onOpenChange={setShowDepreciationDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Depreciation Schedule - {selectedAsset?.name}
            </DialogTitle>
            <DialogDescription>
              Complete depreciation schedule for the selected asset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Purchase Cost:</span>{" "}
                {formatCurrency(selectedAsset?.purchaseCost || 0)}
              </div>
              <div>
                <span className="font-medium">Salvage Value:</span>{" "}
                {formatCurrency(selectedAsset?.salvageValue || 0)}
              </div>
              <div>
                <span className="font-medium">Useful Life:</span>{" "}
                {selectedAsset?.usefulLife || 0} years
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Beginning Value</TableHead>
                  <TableHead>Depreciation Expense</TableHead>
                  <TableHead>Accumulated Depreciation</TableHead>
                  <TableHead>Ending Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depreciationSchedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>{formatCurrency(row.beginningValue)}</TableCell>
                    <TableCell>
                      {formatCurrency(row.depreciationExpense)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(row.accumulatedDepreciation)}
                    </TableCell>
                    <TableCell>{formatCurrency(row.endingValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
