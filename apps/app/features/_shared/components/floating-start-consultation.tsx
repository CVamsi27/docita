"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Stethoscope, ChevronUp } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface FloatingStartConsultationProps {
  patientId?: string;
  appointmentId?: string;
  className?: string;
  minimized?: boolean;
}

export function FloatingStartConsultation({
  patientId,
  appointmentId,
  className,
  minimized = false,
}: FloatingStartConsultationProps) {
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(minimized);

  const handleStartConsultation = () => {
    if (appointmentId) {
      router.push(`/consultation/${appointmentId}`);
    } else if (patientId) {
      router.push(`/consultation/new?patientId=${patientId}`);
    } else {
      router.push("/consultation");
    }
  };

  if (!patientId && !appointmentId) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300",
        className,
      )}
    >
      {isMinimized ? (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl"
          onClick={() => setIsMinimized(false)}
        >
          <Stethoscope className="h-6 w-6" />
        </Button>
      ) : (
        <div className="bg-primary text-primary-foreground rounded-2xl shadow-xl p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <span className="font-semibold">Start Consultation</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMinimized(true)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/80 mb-3">
            Ready to begin consultation for this patient?
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleStartConsultation}
          >
            Begin Now
          </Button>
        </div>
      )}
    </div>
  );
}
