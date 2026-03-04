export interface StationLine {
  code: string;
  color: string;
  textColor: string;
  transportType: string;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isAccessible?: boolean;
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
  /** LineStop ID of the first stop — used for departure re-fetching in navigation mode */
  firstStopLineStopId?: string;
}

export interface Transfer {
  fromLineCode: string;
  toLineCode: string;
  stationName: string;
  walkingTimeSeconds: number;
}

export interface WalkingLeg {
  address: string;
  lat: number;
  lng: number;
  stationName: string;
  stationId: string;
  stationLat: number;
  stationLng: number;
  durationSeconds: number;
  distanceMeters: number;
  /** Street-level walking path as [lat, lng] pairs from OSRM */
  path?: [number, number][];
}

export interface WalkingDirect {
  fromAddress: string;
  fromLat: number;
  fromLng: number;
  toAddress: string;
  toLat: number;
  toLng: number;
  distanceMeters: number;
  durationSeconds: number;
  /** Street-level walking path as [lat, lng] pairs from OSRM */
  path?: [number, number][];
}

export interface RouteResult {
  found: boolean;
  totalDurationSeconds: number;
  totalStations: number;
  totalTransfers: number;
  segments: RouteSegment[];
  transfers: Transfer[];
  walkingFrom?: WalkingLeg;
  walkingTo?: WalkingLeg;
  walkingOnly?: boolean;
  walkingDirect?: WalkingDirect;
}

export interface LabeledRoute {
  label: string;
  route: RouteResult;
}

export interface DirectEstimate {
  durationSeconds: number;
  distanceMeters: number;
  /** Street-level path as [lat, lng] pairs from OSRM */
  path?: [number, number][];
}

export interface MultiRouteResult {
  found: boolean;
  routes: LabeledRoute[];
  /** Direct walking estimate between origin and destination */
  walkingEstimate?: DirectEstimate;
  /** Direct cycling estimate between origin and destination */
  cyclingEstimate?: DirectEstimate;
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

export type PickerSelection =
  | { type: 'station'; station: Station }
  | { type: 'address'; address: string; lat: number; lng: number };

export interface LineStation {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  position: number;
  isAccessible?: boolean;
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

// ─── Navigation ───────────────────────────────────────────

export type NavigationPhase =
  | { type: 'walking_to_station'; segmentIndex: 0 }
  | { type: 'waiting_for_train'; segmentIndex: number; selectedDepartureIndex: number }
  | { type: 'riding'; segmentIndex: number; currentStopIndex: number }
  | { type: 'transfer_walking'; transferIndex: number }
  | { type: 'walking_to_destination' }
  | { type: 'arrived' };
