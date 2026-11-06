import { ArrowRight } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";

export function HeaderActions({ appUrl }: { appUrl: string }) {
  return (
    <>
      <a href={`${appUrl}/login`} className="editorial-login">
        Log in
      </a>
      <Button asChild variant="primary">
        <a href={`${appUrl}/onboarding`} aria-label="Start clinic setup">
          Start setup <ArrowRight aria-hidden="true" strokeWidth={1.5} />
        </a>
      </Button>
    </>
  );
}
