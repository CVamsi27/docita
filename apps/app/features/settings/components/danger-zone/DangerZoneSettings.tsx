"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/hooks/use-confirm";

export function DangerZoneSettings() {
  const { logout } = useAuth();
  const { confirm } = useConfirm();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Sign out",
      description: "Are you sure you want to sign out of your account?",
      confirmText: "Sign out",
      cancelText: "Cancel",
    });
    if (confirmed) {
      logout();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Sign Out</CardTitle>
          <CardDescription>
            Sign out of your Docita account on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
