"use client"

import { X, DollarSign, Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

import { Card } from "@workspace/ui/components/card"
import type { Procedure } from "@/types"

interface ProcedureListProps {
  procedures: Procedure[]
  onRemove: (index: number) => void
  onAddToInvoice?: (procedure: Procedure) => void
}

export function ProcedureList({ procedures, onRemove, onAddToInvoice }: ProcedureListProps) {
  if (procedures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <p className="text-sm">No procedures added yet.</p>
        <p className="text-xs">Search and select procedures to add them to this visit.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-3">
        {procedures.map((procedure, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">
                    {procedure.cptCode.code}
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {procedure.cptCode.category}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {procedure.cptCode.description}
                </p>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span>{procedure.cptCode.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {onAddToInvoice && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => onAddToInvoice(procedure)}
                    title="Add to Invoice"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
