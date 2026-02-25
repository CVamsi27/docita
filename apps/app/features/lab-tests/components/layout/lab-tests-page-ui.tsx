import { FC } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Feature,
  FeatureGate,
} from "@/features/_shared/components/auth/feature-gate";
import { Plus, RefreshCw } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useLabTestsLogic } from "../../hooks/use-lab-tests-logic";
import { LabTestsOverview } from "../tabs/LabTestsOverview";
import { LabTestsOrders } from "../tabs/LabTestsOrders";
import { LabTestsCatalog } from "../tabs/LabTestsCatalog";
import { OrderLabTestDialog } from "../dialogs/OrderLabTestDialog";

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

  return (
    <FeatureGate
      feature={Feature.LAB_TESTS}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <h2 className="text-2xl font-bold mb-2">Lab Tests</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade to access lab test ordering features
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lab Tests</h1>
            <p className="text-muted-foreground">
              Manage laboratory test orders and results
            </p>
          </div>
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
        </div>

        {/* Stats Overview */}
        <LabTestsOverview
          stats={
            stats || { pending: 0, inProgress: 0, completed: 0, urgent: 0 }
          }
        />

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
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

        {/* Order Lab Test Dialog */}
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
      </div>
    </FeatureGate>
  );
};
