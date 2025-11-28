"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"
import {
  Stethoscope,
  LogOut,
  Settings
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useAuth } from "@/lib/auth-context"

import { sidebarItems } from "@/lib/constants"

export function Sidebar({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  return (
    <div 
      className={cn(
        "relative flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out z-10"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border px-6 transition-all duration-300",
        isCollapsed ? "justify-center px-2" : "justify-between"
      )}>
        <div className="flex items-center overflow-hidden whitespace-nowrap">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className={cn(
            "ml-3 text-lg font-bold tracking-tight text-sidebar-foreground transition-all duration-300",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            Docita
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="grid gap-2 px-3">
          {sidebarItems.filter(item => user && item.roles.includes(user.role)).map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={index}
                href={item.href}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300 overflow-hidden",
                  isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                )}>
                  {item.title}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar">
        <Link 
          href="/profile"
          title={isCollapsed ? "Profile" : undefined}
          className={cn(
            "mb-4 flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-sm hover:bg-sidebar-accent transition-colors",
            isCollapsed && "justify-center border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
            <span className="text-sm font-bold">
              {user?.name?.charAt(0) || "D"}
            </span>
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
          )}>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name || "Doctor"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {user?.email || "admin@docita.com"}
            </p>
          </div>
        </Link>

        <div className="grid gap-1">
          <Link
            href="/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/settings" && "bg-sidebar-accent text-sidebar-accent-foreground",
              isCollapsed && "justify-center"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className={cn(
              "whitespace-nowrap transition-all duration-300 overflow-hidden",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
              Settings
            </span>
          </Link>
          
          <Button 
            variant="ghost" 
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10",
              isCollapsed && "justify-center px-0"
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(
              "whitespace-nowrap transition-all duration-300 overflow-hidden",
              isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
              Logout
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
