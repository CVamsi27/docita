"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { FeatureGate, Feature } from "@/components/common/feature-gate";
import {
  Search,
  Plus,
  FlaskConical,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  FileText,
  RefreshCw,
  Loader2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@workspace/ui/components/command";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiHooks } from "@/lib/api-hooks";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";

const createLabTestOrderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  labTestId: z.string().min(1, "Test is required"),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

type CreateLabTestOrderInput = z.infer<typeof createLabTestOrderSchema>;

export default function LabTestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [testComboboxOpen, setTestComboboxOpen] = useState(false);

  const {
    data: labTests = [],
    isLoading,
    refetch,
    isFetching,
  } = apiHooks.useLabTestOrders();
  const { data: stats, refetch: refetchStats } = apiHooks.useLabTestStats();
  const { data: patients = [], isLoading: patientsLoading } =
    apiHooks.usePatients({
      search: patientSearch || undefined,
      limit: patientSearch ? 20 : 5,
    });
  const { data: testCatalog = [], isLoading: catalogLoading } =
    apiHooks.useLabTestCatalog();
  const { mutateAsync: createOrder, isPending: isCreating } =
    apiHooks.useCreateLabTestOrder();

  const form = useForm<CreateLabTestOrderInput>({
    resolver: zodResolver(createLabTestOrderSchema),
    defaultValues: {
      patientId: "",
      labTestId: "",
      appointmentId: undefined,
      notes: "",
    },
  });

  // Get selected patient and test for display
  const selectedPatient = patients.find(
    (p) => p.id === form.watch("patientId"),
  );
  const selectedTest = testCatalog.find(
    (t) => t.id === form.watch("labTestId"),
  );

  const filteredTests = labTests.filter((test) => {
    const patientName = test.patient
      ? `${test.patient.firstName} ${test.patient.lastName}`.toLowerCase()
      : "";
    const testName = test.labTest?.name?.toLowerCase() || "";
    const doctorName = test.doctor?.name?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();

    return (
      patientName.includes(search) ||
      testName.includes(search) ||
      doctorName.includes(search)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const onSubmitOrder = useCallback(
    async (data: CreateLabTestOrderInput) => {
      try {
        await createOrder(data);
        form.reset();
        setIsOrderDialogOpen(false);
        refetch();
        toast.success("Lab test order created successfully");
      } catch (error) {
        console.error("Failed to create lab test order:", error);
        toast.error("Failed to create lab test order. Please try again.");
      }
    },
    [createOrder, form, refetch],
  );

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
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lab Tests</h1>
            <p className="text-muted-foreground">
              Manage laboratory test orders and results
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                refetch();
                refetchStats();
              }}
            >
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {stats?.inProgress ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently processing
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats?.completed ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Results available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats?.urgent ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">
                High priority tests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient, test, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Lab Tests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lab Test Orders</CardTitle>
            <CardDescription>
              A list of all laboratory test orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message="Loading lab tests..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Test Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Ordered By
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Order Date
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((test) => (
                      <tr
                        key={test.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {test.patient
                              ? `${test.patient.firstName} ${test.patient.lastName}`
                              : "Unknown"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {test.labTest?.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground capitalize">
                          {test.labTest?.category || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {test.doctor?.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(test.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={test.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" className="gap-1">
                            <FileText className="h-4 w-4" />
                            {test.status === "completed"
                              ? "View Results"
                              : "Details"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && filteredTests.length === 0 && (
              <EmptyState
                icon={FlaskConical}
                title="No lab tests found"
                description="Lab test orders will appear here"
              />
            )}
          </CardContent>
        </Card>

        {/* Order Lab Test Dialog */}
        <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Order Lab Test</DialogTitle>
              <DialogDescription>
                Create a new lab test order for a patient
              </DialogDescription>
            </DialogHeader>
            <FormProvider {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitOrder)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Patient</FormLabel>
                      <Popover
                        open={patientComboboxOpen}
                        onOpenChange={setPatientComboboxOpen}
                        modal={true}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              type="button"
                              aria-expanded={patientComboboxOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {selectedPatient
                                ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                                : "Search patient by name..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[400px] p-0 z-100"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search patient by name..."
                              value={patientSearch}
                              onValueChange={setPatientSearch}
                            />
                            <CommandList>
                              {patientsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    Searching...
                                  </span>
                                </div>
                              ) : patients.length === 0 ? (
                                <CommandEmpty>
                                  {patientSearch
                                    ? "No patient found."
                                    : "Type to search patients..."}
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {patients.map((patient) => (
                                    <div
                                      key={patient.id}
                                      onClick={() => {
                                        field.onChange(patient.id);
                                        setPatientComboboxOpen(false);
                                      }}
                                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === patient.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>
                                          {patient.firstName} {patient.lastName}
                                        </span>
                                        {patient.phoneNumber && (
                                          <span className="text-xs text-muted-foreground">
                                            {patient.phoneNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="labTestId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Test</FormLabel>
                      <Popover
                        open={testComboboxOpen}
                        onOpenChange={setTestComboboxOpen}
                        modal={true}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              type="button"
                              aria-expanded={testComboboxOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {selectedTest
                                ? selectedTest.name
                                : "Search test by name..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[400px] p-0 z-100"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search test by name..."
                              value={testSearch}
                              onValueChange={setTestSearch}
                            />
                            <CommandList>
                              {catalogLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    Loading tests...
                                  </span>
                                </div>
                              ) : testCatalog.length === 0 ? (
                                <CommandEmpty>No tests available</CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {testCatalog
                                    .filter((test) =>
                                      test.name
                                        .toLowerCase()
                                        .includes(testSearch.toLowerCase()),
                                    )
                                    .map((test) => (
                                      <div
                                        key={test.id}
                                        onClick={() => {
                                          field.onChange(test.id);
                                          setTestComboboxOpen(false);
                                        }}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === test.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        <div className="flex flex-col flex-1">
                                          <span>{test.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {test.category}
                                            {test.price && ` • ₹${test.price}`}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOrderDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating} className="gap-2">
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCreating ? "Creating..." : "Order Test"}
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
