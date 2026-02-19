-- DropIndex
DROP INDEX "LineStop_lineId_stationId_key";

-- CreateIndex
CREATE INDEX "LineStop_lineId_stationId_idx" ON "LineStop"("lineId", "stationId");
