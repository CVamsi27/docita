import { FC, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Plus, RefreshCw } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useLabTestsLogic } from "@/features/lab-tests/hooks/use-lab-tests-logic";
import { LabTestsOverview } from "@/features/lab-tests/components/tabs/LabTestsOverview";
import { LabTestsOrders } from "@/features/lab-tests/components/tabs/LabTestsOrders";
import { LabTestsCatalog } from "@/features/lab-tests/components/tabs/LabTestsCatalog";
import { OrderLabTestDialog } from "@/features/lab-tests/components/dialogs/OrderLabTestDialog";

export const LabTestsPageUI: FC = () => {
  const {
    filteredTests,
    stats,
    isLoading,
    isFetching,
    searchQuery,
    setSearchQuery,
    isOrderDialogOpen,
    setIsOrderDialogOpen,
    form,
    onSubmitOrder,
    patients,
    patientsLoading,
    testCatalog,
    catalogLoading,
    isCreating,
    patientSearch,
    setPatientSearch,
    testSearch,
    setTestSearch,
    patientComboboxOpen,
    setPatientComboboxOpen,
    testComboboxOpen,
    setTestComboboxOpen,
    selectedPatient,
    selectedTest,
    handleRefresh,
  } = useLabTestsLogic();

  const [activeTab, setActiveTab] = useState<"orders" | "catalog">("orders");

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Lab Tests"
          description="Manage laboratory test orders and results."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={handleRefresh}>
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                className="gap-2"
                onClick={() => setIsOrderDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Order Test
              </Button>
            </div>
          }
        />
      }
    >
      <LabTestsOverview
        stats={stats || { pending: 0, inProgress: 0, completed: 0, urgent: 0 }}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "orders" | "catalog")}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="catalog">Test Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <LabTestsOrders
            isLoading={isLoading}
            filteredTests={filteredTests}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <LabTestsCatalog
            testCatalog={testCatalog}
            isLoading={catalogLoading}
          />
        </TabsContent>
      </Tabs>

      <OrderLabTestDialog
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
        form={form}
        onSubmit={onSubmitOrder}
        isCreating={isCreating}
        patients={patients}
        patientsLoading={patientsLoading}
        testCatalog={testCatalog}
        catalogLoading={catalogLoading}
        patientSearch={patientSearch}
        setPatientSearch={setPatientSearch}
        testSearch={testSearch}
        setTestSearch={setTestSearch}
        patientComboboxOpen={patientComboboxOpen}
        setPatientComboboxOpen={setPatientComboboxOpen}
        testComboboxOpen={testComboboxOpen}
        setTestComboboxOpen={setTestComboboxOpen}
        selectedPatient={selectedPatient}
        selectedTest={selectedTest}
      />
    </AppPageScaffold>
  );
};
