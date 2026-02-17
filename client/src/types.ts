export interface StationLine {
  code: string;
  color: string;
  textColor: string;
  transportType: string;
}

export interface Station {
  id: string;
  name: string;
  lines: StationLine[];
}

export interface RouteStop {
  stationName: string;
  stationId: string;
  lat: number;
  lng: number;
}

export interface RouteSegment {
  lineCode: string;
  lineName: string;
  lineColor: string;
  lineTextColor: string;
  transportType: string;
  direction: string;
  stops: RouteStop[];
  durationSeconds: number;
  nextDepartures?: string[];
  waitTimeSeconds?: number;
}

export interface Transfer {
  fromLineCode: string;
  toLineCode: string;
  stationName: string;
  walkingTimeSeconds: number;
}

export interface RouteResult {
  found: boolean;
  totalDurationSeconds: number;
  totalStations: number;
  totalTransfers: number;
  segments: RouteSegment[];
  transfers: Transfer[];
}

export interface LabeledRoute {
  label: string;
  route: RouteResult;
}

export interface MultiRouteResult {
  found: boolean;
  routes: LabeledRoute[];
}

export interface LineStation {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  position: number;
}

export interface LineWithStations {
  id: string;
  code: string;
  name: string;
  transportType: string;
  color: string;
  textColor: string;
  stations: LineStation[];
}
