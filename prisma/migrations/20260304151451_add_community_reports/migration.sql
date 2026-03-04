-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CONTROLEURS', 'RAME_BONDEE', 'ESCALATOR_PANNE', 'ASCENSEUR_PANNE', 'RETARD_NON_SIGNALE', 'GREVE');

-- CreateEnum
CREATE TYPE "ReportLocationType" AS ENUM ('PLATFORM', 'TRANSFER_CORRIDOR', 'STATION_EXIT');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "locationType" "ReportLocationType" NOT NULL,
    "stationId" TEXT NOT NULL,
    "lineCode" TEXT,
    "direction" TEXT,
    "fromLineCode" TEXT,
    "toLineCode" TEXT,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportUpvote" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_stationId_idx" ON "Report"("stationId");

-- CreateIndex
CREATE INDEX "Report_expiresAt_idx" ON "Report"("expiresAt");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "Report_lineCode_idx" ON "Report"("lineCode");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "ReportUpvote_reportId_idx" ON "ReportUpvote"("reportId");

-- CreateIndex
CREATE INDEX "ReportUpvote_userId_idx" ON "ReportUpvote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportUpvote_reportId_userId_key" ON "ReportUpvote"("reportId", "userId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportUpvote" ADD CONSTRAINT "ReportUpvote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportUpvote" ADD CONSTRAINT "ReportUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
