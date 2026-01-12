
import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Clock } from "lucide-react";
import { useReminderSettingsLogic } from "../hooks/use-reminder-settings-logic";

export const ReminderSettingsUI: FC = () => {
    const { settings, updateSettings, handleSave } = useReminderSettingsLogic();

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <div>
                            <CardTitle>Reminder Settings</CardTitle>
                            <CardDescription>Configure appointment reminder timing</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Send reminder before appointment</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={settings.reminderBefore}
                                onChange={(e) => updateSettings({ reminderBefore: e.target.value })}
                                className="w-20"
                                min={1}
                            />
                            <select
                                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={settings.reminderUnit}
                                onChange={(e) => updateSettings({ reminderUnit: e.target.value })}
                            >
                                <option value="hour">Hours</option>
                                <option value="day">Days</option>
                            </select>
                        </div>
                    </div>
                    <Button className="w-full" onClick={handleSave}>Save Settings</Button>
                </CardContent>
            </Card>
        </div>
    );
};
