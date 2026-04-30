import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AlertTriangle,
  Calendar,
  Mail,
  Phone,
  User,
} from "lucide-react";

interface PatientBadgeUIProps {
  fullName: string;
  initials: string;
  age: number | null;
  gender?: string;
  phone?: string;
  email?: string;
  allergiesArray: string[];
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showAllergies?: boolean;
  showContact?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PatientBadgeUI({
  fullName,
  initials,
  age,
  gender,
  phone,
  email,
  allergiesArray,
  avatarUrl,
  size = "md",
  showDetails = false,
  showAllergies = true,
  showContact = false,
  onClick,
  className,
}: PatientBadgeUIProps) {
  const sizeClasses = {
    sm: {
      container: "gap-2",
      avatar: "h-8 w-8 text-xs",
      name: "text-sm",
      details: "text-xs",
    },
    md: {
      container: "gap-3",
      avatar: "h-10 w-10 text-sm",
      name: "text-base",
      details: "text-sm",
    },
    lg: {
      container: "gap-4",
      avatar: "h-12 w-12 text-base",
      name: "text-lg",
      details: "text-sm",
    },
  };

  const sizes = sizeClasses[size];
  const hasAllergies = allergiesArray.length > 0;

  return (
    <div
        className={cn(
          "flex items-center",
          sizes.container,
          onClick &&
            "cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors",
          className,
        )}
        onClick={onClick}
      >
        <Avatar className={sizes.avatar}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
          <AvatarFallback className="border border-border/70 bg-background/70 text-foreground font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium truncate", sizes.name)}>
              {fullName}
            </span>

            {showAllergies && hasAllergies && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="destructive"
                    className="gap-1 h-5 text-[var(--fs-2xs)]"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Allergies
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p>Allergies</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

          </div>

          {showDetails && (
            <div
              className={cn(
                "flex items-center gap-3 text-muted-foreground mt-0.5",
                sizes.details,
              )}
            >
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {age} yrs
                </span>
              )}
              {gender && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {gender}
                </span>
              )}
            </div>
          )}

          {showContact && (
            <div
              className={cn(
                "flex items-center gap-3 text-muted-foreground mt-0.5",
                sizes.details,
              )}
            >
              {phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {phone}
                </span>
              )}
              {email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" />
                  {email}
                </span>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
