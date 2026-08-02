import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { ScrollArea } from "@workspace/ui/components/layout/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Calendar,
  CheckCircle2,
  FileText,
  History,
  LucideIcon,
  Send,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ComingSoonPreview } from "./ComingSoonPreview";

interface SmartTasksTabProps {
  state: {
    taskType: string;
  };
  handlers: {
    setTaskType: (value: string) => void;
  };
}

export const SmartTasksTab = ({ state, handlers }: SmartTasksTabProps) => {
  const { t } = useTranslation("AiAssistant");
  const pane = "smartTasksPane";
  return (
    <div className="space-y-6">
      <ComingSoonPreview>
        {t(`${pane}.comingSoonNotice`)}
      </ComingSoonPreview>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-warning" />
              {t(`${pane}.engineTitle`)}
            </CardTitle>
            <CardDescription>{t(`${pane}.engineDescription`)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t(`${pane}.taskTypeLabel`)}</label>
              <Select value={state.taskType} onValueChange={handlers.setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder={t(`${pane}.taskTypePlaceholder`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow-up">{t(`${pane}.taskFollowUps`)}</SelectItem>
                  <SelectItem value="recalls">{t(`${pane}.taskRecalls`)}</SelectItem>
                  <SelectItem value="reminders">{t(`${pane}.taskReminders`)}</SelectItem>
                  <SelectItem value="reports">{t(`${pane}.taskReports`)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">{t(`${pane}.quickActionsTitle`)}</h4>
              <div className="space-y-2">
                <QuickActionButton
                  icon={Calendar}
                  label={t(`${pane}.actionAutoFollowUps`)}
                />
                <QuickActionButton
                  icon={Send}
                  label={t(`${pane}.actionSendReminders`)}
                />
                <QuickActionButton
                  icon={FileText}
                  label={t(`${pane}.actionGenerateReport`)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t(`${pane}.recentAutomationsTitle`)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                <AutomationItem
                  task={t(`${pane}.automationReminders`)}
                  time={t(`${pane}.time2HoursAgo`)}
                />
                <AutomationItem
                  task={t(`${pane}.automationMonthlyReport`)}
                  time={t(`${pane}.time1DayAgo`)}
                />
                <AutomationItem
                  task={t(`${pane}.automationFollowUps`)}
                  time={t(`${pane}.time2HoursAgo`)}
                />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
}

const QuickActionButton = ({ icon: Icon, label }: QuickActionButtonProps) => (
  <Button variant="outline" className="w-full justify-start" size="sm">
    <Icon className="h-4 w-4 mr-2" />
    {label}
  </Button>
);

interface AutomationItemProps {
  task: string;
  time: string;
}

const AutomationItem = ({ task, time }: AutomationItemProps) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
    <div>
      <p className="text-sm font-medium">{task}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <CheckCircle2 className="h-4 w-4 text-success" />
  </div>
);
