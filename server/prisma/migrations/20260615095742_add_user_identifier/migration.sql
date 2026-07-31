-- AlterTable
ALTER TABLE "User" ADD COLUMN "identifier" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_identifier_key" ON "User"("identifier");
