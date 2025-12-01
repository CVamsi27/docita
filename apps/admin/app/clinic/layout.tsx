"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarItems = [
  {
    title: "Overview",
    href: "/clinic",
    icon: LayoutDashboard,
  },
  {
    title: "Team",
    href: "/clinic/team",
    icon: Users,
  },
  {
    title: "Create Doctor",
    href: "/clinic/create-doctor",
    icon: Stethoscope,
  },
  {
    title: "Create Receptionist",
    href: "/clinic/create-receptionist",
    icon: UserPlus,
  },
];

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isClinicAdmin } = useAuth();

  // Redirect if not clinic admin
  if (!isClinicAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            You do not have access to this portal
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link
            href="/clinic"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <div className="h-6 w-6 rounded-full bg-primary" />
            <span>Docita</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-2">
            {sidebarItems.map((item, index) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/clinic" && pathname.startsWith(item.href));
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t p-4 space-y-2">
          <div className="px-3 py-2 text-sm">
            <p className="text-muted-foreground text-xs">Logged in as</p>
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <ThemeToggle />
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
          <span className="font-bold text-lg">Docita</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
