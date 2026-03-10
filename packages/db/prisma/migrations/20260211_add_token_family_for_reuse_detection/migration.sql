-- Ensure RefreshToken exists for environments where it was introduced outside migration history.
CREATE TABLE IF NOT EXISTS "RefreshToken" (
	"id" TEXT NOT NULL,
	"token" TEXT NOT NULL,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"userId" TEXT NOT NULL,
	"revokedAt" TIMESTAMP(3),
	"replacedByToken" TEXT,
	"tokenFamily" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RefreshToken"
ADD COLUMN IF NOT EXISTS "tokenFamily" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_tokenFamily_idx" ON "RefreshToken"("tokenFamily");

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'RefreshToken_userId_fkey'
	) THEN
		ALTER TABLE "RefreshToken"
		ADD CONSTRAINT "RefreshToken_userId_fkey"
		FOREIGN KEY ("userId") REFERENCES "User"("id")
		ON DELETE CASCADE ON UPDATE CASCADE;
	END IF;
END $$;
