#!/usr/bin/env python3
"""Add accessibility fixes to main app."""

import os
import re

def fix_protected_layout():
    """Add aria-labels to protected layout."""
    path = "/Users/vamsikrishnachandaluri/repos/docita/apps/app/app/(protected)/layout.tsx"
    
    with open(path, "r") as f:
        content = f.read()
    
    # Add aria-label to main element
    content = re.sub(
        r'<main className="flex-1 overflow-y-auto p-4 md:p-6">',
        '<main className="flex-1 overflow-y-auto p-4 md:p-6" aria-label="Main content">',
        content
    )
    
    # Add aria-label to header
    content = re.sub(
        r'<header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">',
        '<header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden" aria-label="Mobile navigation">',
        content
    )
    
    with open(path, "w") as f:
        f.write(content)
    
    print("✅ Fixed protected layout")

def fix_pages():
    """Add page titles via metadata in layout files."""
    # Create layout for dashboard with metadata
    dashboard_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Docita",
  description: "Your clinic dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
    
    with open("/Users/vamsikrishnachandaluri/repos/docita/apps/app/app/(protected)/dashboard/layout.tsx", "w") as f:
        f.write(dashboard_layout)
    
    print("✅ Added dashboard page metadata")
    
    # Create layout for appointments with metadata
    appointments_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Appointments | Docita",
  description: "Manage your appointments",
};

export default function AppointmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
    
    with open("/Users/vamsikrishnachandaluri/repos/docita/apps/app/app/(protected)/appointments/layout.tsx", "w") as f:
        f.write(appointments_layout)
    
    print("✅ Added appointments page metadata")
    
    # Create layout for patients with metadata  
    patients_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patients | Docita",
  description: "Manage your patients",
};

export default function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
    
    with open("/Users/vamsikrishnachandaluri/repos/docita/apps/app/app/(protected)/patients/layout.tsx", "w") as f:
        f.write(patients_layout)
    
    print("✅ Added patients page metadata")

if __name__ == "__main__":
    fix_protected_layout()
    fix_pages()
    print("\n✨ Main app accessibility fixes complete!")
