-- Add tokenFamily field to RefreshToken for token reuse attack detection
ALTER TABLE "RefreshToken" ADD COLUMN "tokenFamily" TEXT;

-- Create index for efficient token reuse attack detection
CREATE INDEX "RefreshToken_tokenFamily_idx" ON "RefreshToken"("tokenFamily");
