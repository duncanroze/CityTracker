-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('METRO', 'RER', 'TRAM', 'BUS');

-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "color" TEXT NOT NULL,
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "idfmId" TEXT,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isAccessible" BOOLEAN NOT NULL DEFAULT false,
    "municipality" TEXT,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineStop" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "travelTimeToNext" INTEGER,
    "lineId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,

    CONSTRAINT "LineStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "walkingTime" INTEGER NOT NULL,
    "fromLineStopId" TEXT NOT NULL,
    "toLineStopId" TEXT NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdfmStopMapping" (
    "id" TEXT NOT NULL,
    "lineStopId" TEXT NOT NULL,
    "idfmStopId" TEXT NOT NULL,
    "isStopArea" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IdfmStopMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Line_code_key" ON "Line"("code");

-- CreateIndex
CREATE INDEX "Line_transportType_idx" ON "Line"("transportType");

-- CreateIndex
CREATE UNIQUE INDEX "Station_slug_key" ON "Station"("slug");

-- CreateIndex
CREATE INDEX "Station_name_idx" ON "Station"("name");

-- CreateIndex
CREATE INDEX "Station_latitude_longitude_idx" ON "Station"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "LineStop_stationId_idx" ON "LineStop"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "LineStop_lineId_position_key" ON "LineStop"("lineId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LineStop_lineId_stationId_key" ON "LineStop"("lineId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_fromLineStopId_toLineStopId_key" ON "Connection"("fromLineStopId", "toLineStopId");

-- CreateIndex
CREATE UNIQUE INDEX "IdfmStopMapping_lineStopId_key" ON "IdfmStopMapping"("lineStopId");

-- AddForeignKey
ALTER TABLE "LineStop" ADD CONSTRAINT "LineStop_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineStop" ADD CONSTRAINT "LineStop_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromLineStopId_fkey" FOREIGN KEY ("fromLineStopId") REFERENCES "LineStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toLineStopId_fkey" FOREIGN KEY ("toLineStopId") REFERENCES "LineStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdfmStopMapping" ADD CONSTRAINT "IdfmStopMapping_lineStopId_fkey" FOREIGN KEY ("lineStopId") REFERENCES "LineStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
