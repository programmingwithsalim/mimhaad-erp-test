"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatementGeneratorProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
}

export function StatementGenerator({
  accountId,
  accountName,
  onClose,
}: StatementGeneratorProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("csv");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateStatement = async () => {
    try {
      setIsGenerating(true);

      // Validate dates
      if (!startDate || !endDate) {
        toast({
          title: "Error",
          description: "Please select both start and end dates",
          variant: "destructive",
        });
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        toast({
          title: "Error",
          description: "Start date cannot be after end date",
          variant: "destructive",
        });
        return;
      }

      // Generate statement URL
      const url = `/api/float-accounts/${accountId}/statement?startDate=${startDate}&endDate=${endDate}&format=${format}`;

      if (format === "csv") {
        // Download CSV file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to generate statement");
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${accountName}-statement-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Success",
          description: "Statement downloaded successfully",
        });
      } else {
        // Get JSON data
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to generate statement");
        }

        const data = await response.json();

        // Create a formatted JSON file for download
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${accountName}-statement-${startDate}-to-${endDate}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Success",
          description: "Statement downloaded successfully",
        });
      }

      onClose();
    } catch (error) {
      console.error("Error generating statement:", error);
      toast({
        title: "Error",
        description: "Failed to generate statement",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Statement
        </CardTitle>
        <CardDescription>
          Generate a statement for {accountName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="format">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV (Excel)</SelectItem>
              <SelectItem value="json">JSON (Data)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleGenerateStatement}
            disabled={isGenerating || !startDate || !endDate}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
