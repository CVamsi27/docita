/**
 * Navigation Bar
 * Top navigation component
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  sticky?: boolean;
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, sticky = true, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn(
        "w-full bg-background border-b border-border px-4 py-3",
        sticky && "sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
      {...props}
    />
  )
);
Navbar.displayName = "Navbar";

export interface NavbarBrandProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  title?: string;
}

const NavbarBrand = React.forwardRef<HTMLDivElement, NavbarBrandProps>(
  ({ className, logo, title, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {logo}
      {title && <span className="font-semibold text-foreground">{title}</span>}
    </div>
  )
);
NavbarBrand.displayName = "NavbarBrand";

export interface NavbarMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

const NavbarMenu = React.forwardRef<HTMLDivElement, NavbarMenuProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-4", className)}
      {...props}
    />
  )
);
NavbarMenu.displayName = "NavbarMenu";

export { Navbar, NavbarBrand, NavbarMenu };
