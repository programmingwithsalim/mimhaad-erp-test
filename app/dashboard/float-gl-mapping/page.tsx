"use client"

import { ManualGLFloatMapping } from "@/components/float-gl-mapping/manual-gl-float-mapping"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function FloatGLMappingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GL-Float Account Mapping</h1>
        <p className="text-muted-foreground">
          Connect your operational float accounts to General Ledger accounts for financial reporting
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Main Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1:1</div>
            <p className="text-xs text-muted-foreground">Each float needs one main GL account</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fee Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N:1</div>
            <p className="text-xs text-muted-foreground">Multiple floats can share fee accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commission Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N:1</div>
            <p className="text-xs text-muted-foreground">Multiple floats can share commission accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Financial Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Auto</div>
            <p className="text-xs text-muted-foreground">GL balances flow to reports automatically</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Mapping</TabsTrigger>
          <TabsTrigger value="auto" disabled>
            Auto Mapping
            <Badge variant="secondary" className="ml-2">
              Coming Soon
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sync" disabled>
            Balance Sync
            <Badge variant="secondary" className="ml-2">
              Coming Soon
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <ManualGLFloatMapping />
        </TabsContent>

        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Mapping</CardTitle>
              <CardDescription>
                Automatically map float accounts to GL accounts based on predefined rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Balance Synchronization</CardTitle>
              <CardDescription>Sync float account balances with their corresponding GL accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
