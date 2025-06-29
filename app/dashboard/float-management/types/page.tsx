"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFloatTypesStore } from "@/lib/float-types-store"
import { AddFloatTypeDialog } from "@/components/float-management/add-float-type-dialog"
import { AddProviderDialog } from "@/components/float-management/add-provider-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Edit, Trash2 } from "lucide-react"

export default function FloatTypesPage() {
  const { types, addFloatType, addProvider, removeFloatType, removeProvider } = useFloatTypesStore()
  const [activeTab, setActiveTab] = useState("types")

  const handleAddFloatType = (type: { id: string; name: string; minThreshold: number; maxThreshold: number }) => {
    addFloatType(type)
  }

  const handleAddProvider = (provider: { typeId: string; id: string; name: string }) => {
    addProvider(provider.typeId, { id: provider.id, name: provider.name })
  }

  const handleRemoveFloatType = (typeId: string) => {
    removeFloatType(typeId)
    toast({
      title: "Float Type Removed",
      description: "The float type has been removed successfully.",
    })
  }

  const handleRemoveProvider = (typeId: string, providerId: string) => {
    removeProvider(typeId, providerId)
    toast({
      title: "Provider Removed",
      description: "The provider has been removed successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Float Types & Providers</h2>
        <div className="flex gap-2">
          <AddFloatTypeDialog onAddType={handleAddFloatType} />
          <AddProviderDialog floatTypes={types} onAddProvider={handleAddProvider} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="types">Float Types</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Float Types</CardTitle>
              <CardDescription>View and manage the different types of float accounts in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Type ID</TableHead>
                    <TableHead>Min Threshold</TableHead>
                    <TableHead>Max Threshold</TableHead>
                    <TableHead>Providers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.id}</TableCell>
                      <TableCell>GHS {type.minThreshold.toLocaleString()}</TableCell>
                      <TableCell>GHS {type.maxThreshold.toLocaleString()}</TableCell>
                      <TableCell>{type.providers.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" disabled>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Float Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove the "{type.name}" float type? This will also remove
                                  all associated providers. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveFloatType(type.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {types.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No float types found. Add a new float type to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Providers</CardTitle>
              <CardDescription>View and manage the providers for each float type.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider Name</TableHead>
                    <TableHead>Provider ID</TableHead>
                    <TableHead>Float Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.flatMap((type) =>
                    type.providers.map((provider) => (
                      <TableRow key={`${type.id}-${provider.id}`}>
                        <TableCell className="font-medium">{provider.name}</TableCell>
                        <TableCell>{provider.id}</TableCell>
                        <TableCell>{type.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Provider</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove the "{provider.name}" provider from the "{type.name}
                                    " float type? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveProvider(type.id, provider.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                  {types.flatMap((type) => type.providers).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No providers found. Add a new provider to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
