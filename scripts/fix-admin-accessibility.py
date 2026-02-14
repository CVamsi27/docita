#!/usr/bin/env python3
"""Fix accessibility issues in admin app."""

import re
import os

def fix_admin_users_page():
    """Add aria-label to the SelectTrigger button."""
    path = "/Users/vamsikrishnachandaluri/repos/docita/apps/admin/app/(protected)/users/page.tsx"
    
    with open(path, "r") as f:
        content = f.read()
    
    # Add aria-label to SelectTrigger
    content = re.sub(
        r'<SelectTrigger className="w-full md:w-\[250px\]">',
        '<SelectTrigger className="w-full md:w-[250px]" aria-label="Filter by clinic">',
        content
    )
    
    with open(path, "w") as f:
        f.write(content)
    
    print("✅ Fixed admin users page critical button violation")

def fix_admin_layout():
    """Add aria-labels to admin layout regions."""
    path = "/Users/vamsikrishnachandaluri/repos/docita/apps/admin/app/(protected)/layout.tsx"
    
    with open(path, "r") as f:
        content = f.read()
    
    # Add aria-label to main element
    content = re.sub(
        r'<main className="flex-1 overflow-y-auto[^"]*">',
        lambda m: m.group(0).replace('>', ' aria-label="Main content">'),
        content
    )
    
    with open(path, "w") as f:
        f.write(content)
    
    print("✅ Fixed admin layout landmarks")

def fix_admin_pages():
    """Add page metadata for admin pages."""
    # Dashboard layout
    dashboard_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Docita Admin",
  description: "Admin dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
    
    with open("/Users/vamsikrishnachandaluri/repos/docita/apps/admin/app/(protected)/dashboard/layout.tsx", "w") as f:
        f.write(dashboard_layout)
    
    print("✅ Added admin dashboard page metadata")
    
    # Users layout
    users_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Docita Admin",
  description: "Manage system users",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
    
    with open("/Users/vamsikrishnachandaluri/repos/docita/apps/admin/app/(protected)/users/layout.tsx", "w") as f:
        f.write(users_layout)
    
    print("✅ Added admin users page metadata")
    
    # Clinics layout
    clinics_path = "/Users/vamsikrishnachandaluri/repos/docita/apps/admin/app/(protected)/clinics/layout.tsx"
    if os.path.exists(os.path.dirname(clinics_path)):
        clinics_layout = '''import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinics | Docita Admin",
  description: "Manage clinics",
};

export default function ClinicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
'''
        
        with open(clinics_path, "w") as f:
            f.write(clinics_layout)
        
        print("✅ Added admin clinics page metadata")
    else:
        print("⏭️  Skipped admin clinics (directory not found)")

if __name__ == "__main__":
    fix_admin_users_page()
    fix_admin_layout()
    fix_admin_pages()
    print("\n✨ Admin app accessibility fixes complete!")
