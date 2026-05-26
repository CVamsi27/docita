"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueue, useResetQueue } from "@/hooks/api/use-appointments";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { RefreshCw, RotateCcw } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/queue-token-status";
import { ConfirmationDialog } from "@workspace/ui/components/confirmation-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  queueSettingsFormSchema,
  type QueueSettingsFormValues,
} from "@/features/settings/schemas/queue-settings-form.schema";

export const QueueSettings = () => {
  return (
    <div className="space-y-6">
      <QueueConfigurationForm />
      <QueueLiveStatusPanel />
    </div>
  );
};
