"use client";

import { FC } from "react";
import { Plus } from "lucide-react";
import type { LabContractResponse } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Form } from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/data-display/data-table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { useLabDirectory } from "@/features/lab-tests/hooks/use-lab-directory";

export const LabDirectorySettings: FC = () => {
  const {
    labs,
    status,
    refetch,
    form,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    onSubmit,
    toggleActive,
    isSaving,
  } = useLabDirectory();

  const columns: DataTableColumn<LabContractResponse>[] = [
    {
      id: "name",
      header: "Lab",
      cell: (lab) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{lab.name}</span>
          <Badge variant={lab.type === "EXTERNAL" ? "secondary" : "outline"}>
            {lab.type === "EXTERNAL" ? "External" : "In-house"}
          </Badge>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      hiddenOnMobile: true,
      cell: (lab) => (
        <span className="text-sm text-muted-foreground">
          {lab.phone || lab.email || "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (lab) => (
        <StatusBadge status={lab.active ? "active" : "inactive"} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (lab) => (
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={lab.active}
              onCheckedChange={() => toggleActive(lab)}
              aria-label={lab.active ? "Deactivate lab" : "Activate lab"}
            />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openEdit(lab)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Labs</h3>
          <p className="text-sm text-muted-foreground">
            Manage in-house and external labs that fulfil test orders.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Lab
        </Button>
      </div>

      <DataState
        status={status}
        loadingMessage="Loading labs…"
        emptyTitle="No labs yet"
        emptyDescription="Add an in-house or external lab to route test orders to it."
        emptyAction={{ label: "Add Lab", onClick: openCreate }}
        onRetry={() => refetch()}
      >
        <DataTable data={labs} columns={columns} rowKey={(lab) => lab.id} />
      </DataState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit lab" : "Add lab"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this lab's details."
                : "Register a lab to route test orders to it."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <DialogBody className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Lab name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INTERNAL">In-house</SelectItem>
                          <SelectItem value="EXTERNAL">
                            External partner
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Phone"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Email"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Address"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {editing ? "Save" : "Add Lab"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
