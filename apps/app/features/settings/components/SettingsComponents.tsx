"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Bell, MessageSquare, Mail, Smartphone, Clock, Calendar } from "lucide-react";

// Settings components with actual UI (not just stubs)

export function WhatsAppAutomationSettings() {
  const [settings, setSettings] = useState({
    appointmentReminders: true,
    followUpMessages: true,
    birthdayWishes: false,
    medicineReminders: true,
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle>WhatsApp Automation</CardTitle>
              <CardDescription>Configure automated patient messaging</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Appointment Reminders</Label>
              <p className="text-sm text-muted-foreground">Send reminders before appointments</p>
            </div>
            <Switch
              checked={settings.appointmentReminders}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, appointmentReminders: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Follow-up Messages</Label>
              <p className="text-sm text-muted-foreground">Send follow-up reminders after visits</p>
            </div>
            <Switch
              checked={settings.followUpMessages}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, followUpMessages: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Birthday Wishes</Label>
              <p className="text-sm text-muted-foreground">Send birthday greetings to patients</p>
            </div>
            <Switch
              checked={settings.birthdayWishes}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, birthdayWishes: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Medicine Reminders</Label>
              <p className="text-sm text-muted-foreground">Send medication reminders to patients</p>
            </div>
            <Switch
              checked={settings.medicineReminders}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, medicineReminders: checked }))}
            />
          </div>
          <Button className="w-full">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    appointmentAlerts: true,
    reportAlerts: true,
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email updates</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive SMS alerts</p>
              </div>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, smsNotifications: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, pushNotifications: checked }))}
            />
          </div>
          <Button className="w-full">Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function DoctorAvailabilitySettings() {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Doctor Availability</CardTitle>
              <CardDescription>Configure working hours and availability</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input type="time" defaultValue="18:00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slot Duration (minutes)</Label>
            <Input type="number" defaultValue="15" min={5} max={60} step={5} />
          </div>
          <div className="space-y-2">
            <Label>Break Time</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" defaultValue="13:00" placeholder="Start" />
              <Input type="time" defaultValue="14:00" placeholder="End" />
            </div>
          </div>
          <Button className="w-full">Update Availability</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-export ReminderSettings
export { ReminderSettingsUI as ReminderSettings } from "./ReminderSettingsUI";

// Keep simple stubs for less-used components
export function CustomFieldsSettings() {
  const [fields, setFields] = useState([
    { name: 'Emergency Contact', type: 'Text', required: true },
    { name: 'Insurance Provider', type: 'Text', required: false },
    { name: 'Preferred Language', type: 'Select', required: false },
  ]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Custom Fields</CardTitle>
          <CardDescription>Define custom fields for patient records</CardDescription>
        </div>
        <Button size="sm">Add Field</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{field.name}</p>
                <p className="text-xs text-muted-foreground">{field.type} {field.required && '• Required'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ClinicGeneralSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Clinic Information</CardTitle>
        <CardDescription>Basic clinic settings and information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Clinic Name</Label>
          <Input placeholder="Enter clinic name" />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input placeholder="Enter address" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input placeholder="Enter phone number" />
        </div>
        <Button className="w-full">Save Changes</Button>
      </CardContent>
    </Card>
  );
}

export function SecuritySettings() {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    ipWhitelist: false,
    auditLogs: true,
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage security and access controls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
          </div>
          <Switch
            checked={settings.twoFactorAuth}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, twoFactorAuth: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Session Timeout (minutes)</Label>
            <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
          </div>
          <Input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))}
            className="w-20"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Enable Audit Logs</Label>
            <p className="text-sm text-muted-foreground">Track all user actions</p>
          </div>
          <Switch
            checked={settings.auditLogs}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, auditLogs: checked }))}
          />
        </div>
        <Button className="w-full">Save Security Settings</Button>
      </CardContent>
    </Card>
  );
}

export function ChangePasswordSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Current Password</Label>
          <Input type="password" placeholder="Enter current password" />
        </div>
        <div className="space-y-2">
          <Label>New Password</Label>
          <Input type="password" placeholder="Enter new password" />
        </div>
        <div className="space-y-2">
          <Label>Confirm New Password</Label>
          <Input type="password" placeholder="Confirm new password" />
        </div>
        <Button className="w-full">Update Password</Button>
      </CardContent>
    </Card>
  );
}

export function BillingSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
        <CardDescription>Configure billing and payment options</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Default Tax Rate (%)</Label>
          <Input type="number" defaultValue="18" />
        </div>
        <div className="space-y-2">
          <Label>Invoice Prefix</Label>
          <Input defaultValue="INV-" />
        </div>
        <div className="space-y-2">
          <Label>Payment Terms (days)</Label>
          <Input type="number" defaultValue="7" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Online Payments</Label>
            <p className="text-sm text-muted-foreground">Accept payments via Razorpay</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Button className="w-full">Save Billing Settings</Button>
      </CardContent>
    </Card>
  );
}

// MemberManagementSettings - use the API-connected version from MemberManagementSettings.tsx


export function SubscriptionSettings() {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Pro Plan</p>
              <p className="text-sm text-muted-foreground">₹2,499/month • Renews Jan 15</p>
            </div>
            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Active</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Patients</p>
            <p className="text-lg font-bold">247 / Unlimited</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">Storage</p>
            <p className="text-lg font-bold">2.3 GB / 10 GB</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">Manage Billing</Button>
          <Button className="flex-1">Upgrade Plan</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorManagementSettings() {
  const doctors = [
    { name: 'Dr. Vamsi Krishna', specialty: 'Cardiology', patients: 87 },
    { name: 'Dr. Priya Sharma', specialty: 'Pediatrics', patients: 124 },
    { name: 'Dr. Arun Menon', specialty: 'Dental', patients: 65 },
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Doctor Management</CardTitle>
          <CardDescription>Manage doctor profiles and assignments</CardDescription>
        </div>
        <Button size="sm">Add Doctor</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {doctors.map((doctor, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
              <div>
                <p className="font-medium">{doctor.name}</p>
                <p className="text-xs text-muted-foreground">{doctor.specialty} • {doctor.patients} patients</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Schedule</Button>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export TemplatesSettings
export { TemplatesSettingsUI as TemplatesSettings } from "./TemplatesSettingsUI";

export function AppearanceSettings() {
  const [theme, setTheme] = useState('system');

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {['light', 'dark', 'system'].map((t) => (
              <Button
                key={t}
                variant={theme === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>Accent Color</Label>
          <div className="flex gap-2">
            {['blue', 'green', 'purple', 'orange'].map((color) => (
              <button
                key={color}
                className={`h-8 w-8 rounded-full bg-${color}-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary`}
                style={{ backgroundColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#22c55e' : color === 'purple' ? '#a855f7' : '#f97316' }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Compact Mode</Label>
            <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
          </div>
          <Switch />
        </div>
        <Button className="w-full">Save Appearance</Button>
      </CardContent>
    </Card>
  );
}

// Modal stubs
export function DoctorProfileModal() {
  return null;
}

export function PaymentModal() {
  return null;
}
