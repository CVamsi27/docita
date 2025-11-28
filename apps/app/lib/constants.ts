import {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Receipt,
    MessageSquare,
    BarChart3,
    ScanLine,
} from "lucide-react"

export const sidebarItems = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Patients",
        href: "/patients",
        icon: Users,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Appointments",
        href: "/appointments",
        icon: Calendar,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Invoices",
        href: "/invoices",
        icon: Receipt,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Prescriptions",
        href: "/prescriptions",
        icon: FileText,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Documents",
        href: "/documents",
        icon: FileText,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Scan Documents",
        href: "/import/ocr",
        icon: ScanLine,
        roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "WhatsApp",
        href: "/whatsapp",
        icon: MessageSquare,
        roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Coding Queue",
        href: "/coding-queue",
        icon: FileText,
        roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    },
    {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    },
]
