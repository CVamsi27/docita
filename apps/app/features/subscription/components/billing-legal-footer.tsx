"use client";

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
        <button
          type="button"
          className="ml-1 underline underline-offset-2 hover:text-foreground"
          onClick={onOpenTerms}
        >
          Terms of Service
        </button>
        <span className="mx-1">and</span>
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={onOpenPrivacy}
        >
          Privacy Policy
        </button>
        . All prices are inclusive of GST and applicable taxes.
      </p>
    </div>
  );
}
