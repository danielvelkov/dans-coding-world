-- DropForeignKey
ALTER TABLE "public"."ReportHistory" DROP CONSTRAINT "ReportHistory_moderatorId_fkey";

-- AlterTable
ALTER TABLE "public"."ReportHistory" ALTER COLUMN "moderatorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ReportHistory" ADD CONSTRAINT "ReportHistory_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
