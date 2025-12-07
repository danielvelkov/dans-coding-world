-- CreateTable
CREATE TABLE "public"."Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "commentId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterId_commentId_key" ON "public"."Report"("reporterId", "commentId");

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
