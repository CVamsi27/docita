"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export function CustomFieldsSettings() {
  const [fields] = useState([
    { name: 'Emergency Contact', type: 'Text', required: true },
    { name: 'Insurance Provider', type: 'Text', required: false },
    { name: 'Preferred Language', type: 'Select', required: false },
  ]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Custom Fields</CardTitle>
          <CardDescription>Define custom fields for patient records</CardDescription>
        </div>
        <Button size="sm">Add Field</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{field.name}</p>
                <p className="text-xs text-muted-foreground">{field.type} {field.required && '• Required'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
