import { AlertCircle } from "lucide-react";

interface ErrorPageShellProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function ErrorPageShell({
  title,
  description,
  children,
}: ErrorPageShellProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mb-6 text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}
