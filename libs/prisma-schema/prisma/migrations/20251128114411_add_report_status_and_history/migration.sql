-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."ReportHistory" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "moderatorId" INTEGER NOT NULL,
    "previousStatus" "public"."ReportStatus" NOT NULL,
    "newStatus" "public"."ReportStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ReportHistory" ADD CONSTRAINT "ReportHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportHistory" ADD CONSTRAINT "ReportHistory_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
