import { useState } from "react";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerMe, usePartnerShareMessage } from "@workspace/data-access";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";

export function PartnerShareCard() {
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const me = usePartnerMe(ctx.accessToken, ctx.baseUrl);
  const share = usePartnerShareMessage(ctx.accessToken, ctx.baseUrl);
  const [copied, setCopied] = useState<"message" | "signup" | null>(null);

  const copy = async (text: string, kind: "message" | "signup") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // best-effort; clipboard might be denied in some browsers
    }
  };

  if (me.isLoading || share.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading share kit...</div>;
  }
  if (!me.data || !share.data) {
    return <div className="text-sm text-muted-foreground">Share kit not available yet.</div>;
  }
  // Destructure so the closures below can read narrowed values without
  // re-checking or non-null asserting.
  const meData = me.data;
  const shareData = share.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Share kit</h1>
        <p className="text-sm text-muted-foreground">
          Copy a message, download the showcase PDF, or send a doctor your signup link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your signup link</CardTitle>
          <CardDescription>
            Send this to any doctor or clinic owner. The link applies your referral code automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {meData.signupUrl}
          </pre>
          <Button
            type="button"
            onClick={() => void copy(meData.signupUrl, "signup")}
            variant="outline"
          >
            {copied === "signup" ? "Copied" : "Copy link"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggested WhatsApp message</CardTitle>
          <CardDescription>
            Pre-filled with your name and code. Copy and paste into a chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
            {shareData.message}
          </pre>
          <Button
            type="button"
            onClick={() => void copy(shareData.message, "message")}
            variant="outline"
          >
            {copied === "message" ? "Copied" : "Copy message"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Showcase PDF</CardTitle>
          <CardDescription>
            A one-page PDF explaining Docita to a doctor. Hand it out or attach it to your message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={meData.showcasePdfUrl} target="_blank" rel="noreferrer">
              Download showcase PDF
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
