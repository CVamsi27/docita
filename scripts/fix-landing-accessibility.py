#!/usr/bin/env python3
"""Fix accessibility issues in landing app."""

import re
import os

def fix_landing_layout():
    """Add aria-labels to landing layout regions."""
    path = "/Users/vamsikrishnachandaluri/repos/docita/apps/landing/app/layout.tsx"
    
    with open(path, "r") as f:
        content = f.read()
    
    # Add aria-labels if not already present
    if 'aria-label="Main content"' not in content:
        content = re.sub(
            r'<main>',
            '<main aria-label="Main content">',
            content
        )
    
    with open(path, "w") as f:
        f.write(content)
    
    print("✅ Fixed landing layout landmarks")

def fix_landing_pages():
    """Add page metadata for landing pages."""
    pages = {
        "": ("Home | Docita", "Welcome to Docita - Clinic Management System"),
        "features": ("Features | Docita", "Explore Docita's features"),
        "pricing": ("Pricing | Docita", "View our pricing plans"),
        "about": ("About | Docita", "Learn about Docita"),
    }
    
    for page_path, (title, description) in pages.items():
        if page_path == "":
            # Root page might not have a separate layout
            continue
        
        file_path = f"/Users/vamsikrishnachandaluri/repos/docita/apps/landing/app/{page_path}/layout.tsx"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        layout_content = f'''import type {{ Metadata }} from "next";

export const metadata: Metadata = {{
  title: "{title}",
  description: "{description}",
}};

export default function {page_path.capitalize()}Layout({{
  children,
}}: {{
  children: React.ReactNode;
}}) {{
  return <>{{children}}</>;
}}
'''
        
        with open(file_path, "w") as f:
            f.write(layout_content)
        
        print(f"✅ Added {page_path or 'home'} page metadata")

if __name__ == "__main__":
    fix_landing_layout()
    fix_landing_pages()
    print("\n✨ Landing app accessibility fixes complete!")
