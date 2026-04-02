import { format } from "date-fns";
import { FileText } from "lucide-react";
import { CardContent, InteractiveCard } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { DataState } from "@workspace/ui/components/data-state";
import { Document } from "@workspace/types";

interface PatientDocumentsTabUIProps {
  documents: Document[];
  loading?: boolean;
}

export function PatientDocumentsTabUI({
  documents,
  loading,
}: PatientDocumentsTabUIProps) {
  if (loading) {
    return <DataState status="loading" loadingMessage="Loading documents..." />;
  }

  if (documents.length === 0) {
    return (
      <DataState
        status="empty"
        emptyIcon={FileText}
        emptyTitle="No documents found"
        emptyDescription="Uploaded reports and attachments will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {documents.map((doc) => (
        <InteractiveCard
          key={doc.id}
          className="group border-none bg-muted/30"
        >
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h4 className="font-semibold truncate w-full px-2">
                {doc.name || doc.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(doc.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <Badge variant="secondary" className="mt-2">
              {doc.type}
            </Badge>
          </CardContent>
        </InteractiveCard>
      ))}
    </div>
  );
}
