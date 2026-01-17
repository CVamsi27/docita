import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
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
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading documents...
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className="group cursor-pointer hover:shadow-md transition-all border-none bg-muted/30 hover:bg-background"
        >
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
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
        </Card>
      ))}
      {documents.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          <FileText className="h-12 w-12 mb-4 opacity-20" />
          <p>No documents found</p>
        </div>
      )}
    </div>
  );
}
