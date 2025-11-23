import {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Receipt,
} from "lucide-react"

export const sidebarItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Patients",
        href: "/patients",
        icon: Users,
    },
    {
        title: "Appointments",
        href: "/appointments",
        icon: Calendar,
    },
    {
        title: "Invoices",
        href: "/invoices",
        icon: Receipt,
    },
    {
        title: "Records",
        href: "/records",
        icon: FileText,
    },
    {
        title: "Import Data",
        href: "/import",
        icon: FileText, // Fallback icon since Upload was removed
    },
]
