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

interface SmartTasksTabProps {
  state: {
    taskType: string;
  };
  handlers: {
    setTaskType: (value: string) => void;
  };
}

export const SmartTasksTab = ({ state, handlers }: SmartTasksTabProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-warning" />
          Smart Task Engine
        </CardTitle>
        <CardDescription>AI-powered workflow automation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Task type</label>
          <Select value={state.taskType} onValueChange={handlers.setTaskType}>
            <SelectTrigger>
              <SelectValue placeholder="Task type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="follow-up">Schedule Follow-ups</SelectItem>
              <SelectItem value="recalls">Patient recalls</SelectItem>
              <SelectItem value="reminders">Custom reminders</SelectItem>
              <SelectItem value="reports">Generate reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <h4 className="font-medium mb-2">Quick actions</h4>
          <div className="space-y-2">
            <QuickActionButton
              icon={Calendar}
              label="Auto-schedule all pending follow-ups"
            />
            <QuickActionButton
              icon={Send}
              label="Send reminders to no-show risks"
            />
            <QuickActionButton
              icon={FileText}
              label="Generate weekly summary report"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Recent Automations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            <AutomationItem
              task="Sent 15 appointment reminders"
              time="2 hours ago"
            />
            <AutomationItem
              task="Generated monthly analytics report"
              time="1 day ago"
            />
            <AutomationItem
              task="Scheduled 8 follow-up appointments"
              time="2 hours ago"
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
);

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
