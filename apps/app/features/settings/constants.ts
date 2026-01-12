
import {
    Bell,
    Building2,
    Calendar,
    CreditCard,
    Crown,
    FileText,
    Layers,
    Lock,
    MessageSquare,
    Paintbrush,
    Settings,
    Users,
} from "lucide-react";

export const settingsTabs = [
    {
        category: "Practice",
        items: [
            {
                value: "general",
                label: "General",
                icon: Building2,
                description: "Clinic info & hours",
            },
            {
                value: "members",
                label: "Team Members",
                icon: Users,
                description: "Staff & permissions",
            },
            {
                value: "billing",
                label: "Billing",
                icon: CreditCard,
                description: "Payments & invoices",
            },
            {
                value: "subscription",
                label: "Subscription",
                icon: Crown,
                description: "Plan & usage",
            },
        ],
    },
    {
        category: "Clinical",
        items: [
            {
                value: "availability",
                label: "Availability",
                icon: Calendar,
                description: "Doctor schedules",
            },
            {
                value: "queue",
                label: "Queue",
                icon: Users,
                description: "Patient queue settings",
            },
            {
                value: "prescriptions",
                label: "Prescriptions",
                icon: FileText,
                description: "Rx defaults",
            },
            {
                value: "templates",
                label: "Templates",
                icon: Layers,
                description: "Document templates",
            },
        ],
    },
    {
        category: "Automation",
        items: [
            {
                value: "reminders",
                label: "Reminders",
                icon: Bell,
                description: "Appointment alerts",
            },
            {
                value: "whatsapp",
                label: "WhatsApp",
                icon: MessageSquare,
                description: "Messaging automation",
            },
            {
                value: "custom-fields",
                label: "Custom Fields",
                icon: Settings,
                description: "Form customization",
            },
        ],
    },
    {
        category: "Account",
        items: [
            {
                value: "notifications",
                label: "Notifications",
                icon: Bell,
                description: "Alert preferences",
            },
            {
                value: "security",
                label: "Security",
                icon: Lock,
                description: "Password & 2FA",
            },
            {
                value: "appearance",
                label: "Appearance",
                icon: Paintbrush,
                description: "Theme & display",
            },
        ],
    },
];
