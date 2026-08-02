"use client";

import { Button } from "@workspace/ui/components/form/button";

export function LegalFooter({
  onOpenTerms,
  onOpenPrivacy,
}: {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  return (
    <div className="text-center text-xs text-muted-foreground pt-2 pb-6">
      <p>
        By upgrading, you agree to our
        <Button
          variant="link"
          size="sm"
          className="ml-1 underline underline-offset-2 hover:text-foreground"
          onClick={onOpenTerms}
        >
          Terms of Service
        </Button>
        <span className="mx-1">and</span>
        <Button
          variant="link"
          size="sm"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={onOpenPrivacy}
        >
          Privacy Policy
        </Button>
        . All prices are inclusive of GST and applicable taxes.
      </p>
    </div>
  );
}
