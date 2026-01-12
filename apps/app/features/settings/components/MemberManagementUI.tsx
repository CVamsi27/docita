
import { FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { UserPlus } from "lucide-react";
import { User } from "@workspace/types";

interface MemberManagementUIProps {
    members: User[];
    isLoading: boolean;
    error: Error | null;
}

export const MemberManagementUI: FC<MemberManagementUIProps> = ({ members, isLoading, error }) => {
    if (isLoading) {
        return (
            <Card className="border-none shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>Loading team members...</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-none shadow-lg">
                <CardContent className="py-8 text-center text-muted-foreground">
                    Failed to load team members
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage clinic staff and permissions</CardDescription>
                </div>
                <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                </Button>
            </CardHeader>
            <CardContent>
                {members.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        No team members found. Invite your first team member.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                        {member.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "?"}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.name || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {member.email} •{" "}
                                            <Badge variant="outline" className="ml-1">
                                                {member.role || "Staff"}
                                            </Badge>
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Manage
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
