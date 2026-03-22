-- CreateTable
CREATE TABLE "SignatureUploadToken" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureUploadToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignatureUploadToken_token_key" ON "SignatureUploadToken"("token");

-- CreateIndex
CREATE INDEX "SignatureUploadToken_doctorId_idx" ON "SignatureUploadToken"("doctorId");

-- CreateIndex
CREATE INDEX "SignatureUploadToken_token_idx" ON "SignatureUploadToken"("token");

-- CreateIndex
CREATE INDEX "SignatureUploadToken_expiresAt_idx" ON "SignatureUploadToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "SignatureUploadToken" ADD CONSTRAINT "SignatureUploadToken_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
