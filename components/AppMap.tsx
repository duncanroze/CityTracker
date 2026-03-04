'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import { useMapContext } from '@/contexts/MapContext';
import ReportMapMarkers from './ReportMapMarkers';

function MapController({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  const { overlay, previewPins } = useMapContext();
  const hadOverlay = useRef(false);

  // Invalidate size when map container might have resized
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  // Track zoom level
  useEffect(() => {
    onZoomChange(map.getZoom());
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map, onZoomChange]);

  // Fit bounds based on overlay
  useEffect(() => {
    const points: LatLngTuple[] = [];

    if (overlay.type === 'route' && overlay.route) {
      // Walking-only route
      if (overlay.route.walkingOnly && overlay.route.walkingDirect) {
        const wd = overlay.route.walkingDirect;
        points.push([wd.fromLat, wd.fromLng]);
        points.push([wd.toLat, wd.toLng]);
      } else {
        for (const seg of overlay.route.segments) {
          for (const stop of seg.stops) {
            points.push([stop.lat, stop.lng]);
          }
        }
      }
      // Include walking leg endpoints in bounds
      if (overlay.route.walkingFrom) {
        points.push([overlay.route.walkingFrom.lat, overlay.route.walkingFrom.lng]);
      }
      if (overlay.route.walkingTo) {
        points.push([overlay.route.walkingTo.lat, overlay.route.walkingTo.lng]);
      }
    } else if (overlay.type === 'line' && overlay.line) {
      for (const station of overlay.line.stations) {
        points.push([station.latitude, station.longitude]);
      }
    }

    if (points.length > 0) {
      hadOverlay.current = true;
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
    } else if (!hadOverlay.current) {
      // Default Paris view only on initial load, not when clearing between searches
      map.setView([48.8566, 2.3522], 12);
    }
  }, [overlay, map]);

  // Fly to preview pins when they change (and no route overlay active)
  useEffect(() => {
    if (overlay.type !== 'none') return;
    if (previewPins.length === 0) return;

    if (previewPins.length === 1) {
      map.flyTo([previewPins[0].lat, previewPins[0].lng], 14, { duration: 0.8 });
    } else if (previewPins.length === 2) {
      const bounds: LatLngTuple[] = previewPins.map((p) => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [previewPins, overlay.type, map]);

  return null;
}

function createPinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<svg width="20" height="28" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));cursor:grab">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.268 21.732 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="7" fill="white" opacity="0.25"/>
      <circle cx="14" cy="14" r="4.5" fill="white"/>
    </svg>`,
    iconSize: [20, 28],
    iconAnchor: [10, 28],
    tooltipAnchor: [0, -24],
  });
}

const originPinIcon = createPinIcon('#16a34a');
const destinationPinIcon = createPinIcon('#dc2626');

const userPositionIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div class="user-position-pulse" style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.4);"></div>
      <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function UserPositionMarker() {
  const { userPosition } = useMapContext();
  if (!userPosition) return null;

  return (
    <>
      <Circle
        center={[userPosition.lat, userPosition.lng]}
        radius={userPosition.accuracy}
        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f680', fillOpacity: 0.12, weight: 1 }}
      />
      <Marker position={[userPosition.lat, userPosition.lng]} icon={userPositionIcon} />
    </>
  );
}

function MapClickHandler() {
  const { overlay, setLastMapClick } = useMapContext();
  const map = useMapEvents({
    dblclick(e) {
      // Only handle double-clicks when no route/line overlay is active
      if (overlay.type !== 'none') return;
      setLastMapClick({ lat: e.latlng.lat, lng: e.latlng.lng, ts: Date.now() });
    },
  });

  // Disable default double-click zoom behavior
  useEffect(() => {
    map.doubleClickZoom.disable();
    return () => {
      map.doubleClickZoom.enable(); // Cleanup on unmount
    };
  }, [map]);

  return null;
}

function shortAddress(address: string): string {
  const banMatch = address.match(/^(.+?)\s+\d{5}\s/);
  if (banMatch) return banMatch[1];
  const parts = address.split(',');
  if (parts.length >= 2) return parts.slice(0, 2).join(',').trim();
  return address;
}

export default function AppMap() {
  const { overlay, dark, previewPins, setLastPinDrag } = useMapContext();

  const handlePinDragEnd = useCallback((type: 'origin' | 'destination', e: L.DragEndEvent) => {
    const latlng = (e.target as L.Marker).getLatLng();
    setLastPinDrag({ lat: latlng.lat, lng: latlng.lng, type, ts: Date.now() });
  }, [setLastPinDrag]);

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

  // Route overlays
  const routeData = useMemo(() => {
    if (overlay.type !== 'route' || !overlay.route) return null;
    const route = overlay.route;

    // Walking-only route: dotted line along streets from A to B
    if (route.walkingOnly && route.walkingDirect) {
      const wd = route.walkingDirect;
      const origin: { position: LatLngTuple; name: string } = {
        position: [wd.fromLat, wd.fromLng],
        name: shortAddress(wd.fromAddress),
      };
      const destination: { position: LatLngTuple; name: string } = {
        position: [wd.toLat, wd.toLng],
        name: shortAddress(wd.toAddress),
      };
      const mins = Math.round(wd.durationSeconds / 60);
      const positions: LatLngTuple[] = wd.path && wd.path.length > 0
        ? wd.path.map(([lat, lng]): LatLngTuple => [lat, lng])
        : [origin.position, destination.position];
      return {
        segments: [],
        stops: [],
        transfers: [],
        walkingLines: [{
          positions,
          label: `${mins > 0 ? `${mins} min` : '< 1 min'}`,
        }],
        walkFromPin: null,
        walkToPin: null,
        origin,
        destination,
        allPoints: positions,
      };
    }

    const segments = route.segments.map((seg) => ({
      positions: seg.stops.map((s): LatLngTuple => [s.lat, s.lng]),
      color: seg.lineColor,
      key: seg.lineCode,
    }));

    const stops: { position: LatLngTuple; name: string; color: string }[] = [];
    for (const seg of route.segments) {
      for (const stop of seg.stops) {
        stops.push({
          position: [stop.lat, stop.lng],
          name: stop.stationName,
          color: seg.lineColor,
        });
      }
    }

    const transfers: { from: LatLngTuple; to: LatLngTuple }[] = [];
    for (let i = 1; i < route.segments.length; i++) {
      const prevStops = route.segments[i - 1].stops;
      const lastStop = prevStops[prevStops.length - 1];
      const firstStop = route.segments[i].stops[0];
      transfers.push({
        from: [lastStop.lat, lastStop.lng],
        to: [firstStop.lat, firstStop.lng],
      });
    }

    // Walking legs (with OSRM street-level paths when available)
    const walkingLines: { positions: LatLngTuple[]; label: string }[] = [];
    let walkFromPin: { position: LatLngTuple; name: string } | null = null;
    let walkToPin: { position: LatLngTuple; name: string } | null = null;

    if (route.walkingFrom) {
      const wf = route.walkingFrom;
      walkFromPin = { position: [wf.lat, wf.lng], name: shortAddress(wf.address) };
      const positions: LatLngTuple[] = wf.path && wf.path.length > 0
        ? wf.path.map(([lat, lng]): LatLngTuple => [lat, lng])
        : [[wf.lat, wf.lng], [wf.stationLat, wf.stationLng]];
      walkingLines.push({
        positions,
        label: `${Math.round(wf.durationSeconds / 60)} min`,
      });
    }
    if (route.walkingTo) {
      const wt = route.walkingTo;
      walkToPin = { position: [wt.lat, wt.lng], name: shortAddress(wt.address) };
      const positions: LatLngTuple[] = wt.path && wt.path.length > 0
        ? wt.path.map(([lat, lng]): LatLngTuple => [lat, lng])
        : [[wt.stationLat, wt.stationLng], [wt.lat, wt.lng]];
      walkingLines.push({
        positions,
        label: `${Math.round(wt.durationSeconds / 60)} min`,
      });
    }

    // Origin/destination: use address pin if walking, otherwise first/last station
    const allPoints: LatLngTuple[] = [];
    for (const seg of route.segments) {
      for (const stop of seg.stops) {
        allPoints.push([stop.lat, stop.lng]);
      }
    }
    if (walkFromPin) allPoints.push(walkFromPin.position);
    if (walkToPin) allPoints.push(walkToPin.position);

    const origin = walkFromPin ?? { position: allPoints[0], name: stops[0].name };
    const destination = walkToPin ?? { position: allPoints[allPoints.length - 1], name: stops[stops.length - 1].name };

    return { segments, stops, transfers, walkingLines, walkFromPin, walkToPin, origin, destination, allPoints };
  }, [overlay.type, overlay.route]);

  // Line overlay — split into branches by detecting position gaps > 1
  const lineData = useMemo(() => {
    if (overlay.type !== 'line' || !overlay.line) return null;
    const line = overlay.line;

    const branches: LatLngTuple[][] = [];
    let currentBranch: LatLngTuple[] = [];
    for (let i = 0; i < line.stations.length; i++) {
      if (i > 0 && line.stations[i].position - line.stations[i - 1].position > 1) {
        branches.push(currentBranch);
        currentBranch = [];
      }
      currentBranch.push([line.stations[i].latitude, line.stations[i].longitude]);
    }
    if (currentBranch.length > 0) branches.push(currentBranch);

    return { branches, color: line.color, stations: line.stations };
  }, [overlay.type, overlay.line]);

  const [zoom, setZoom] = useState(12);
  const showLabels = zoom >= 13;

  const tooltipStyle = {
    background: dark ? 'rgba(23,23,23,0.9)' : 'rgba(255,255,255,0.9)',
    color: dark ? '#e5e5e5' : '#1a1a1a',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  } as const;

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={12}
        minZoom={9}
        maxBounds={[[48.1, 1.4], [49.3, 3.6]]}
        maxBoundsViscosity={0.8}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer key={dark ? 'dark' : 'light'} attribution={tileAttribution} url={tileUrl} />
        <MapController onZoomChange={setZoom} />
        <MapClickHandler />
        <UserPositionMarker />

        {/* Route overlay */}
        {routeData && (
          <>
            {routeData.segments.map((seg, i) => (
              <Polyline
                key={`${seg.key}-${i}`}
                positions={seg.positions}
                pathOptions={{ color: seg.color, weight: 5, opacity: 0.9 }}
              />
            ))}
            {routeData.transfers.map((t, i) => (
              <Polyline
                key={`t-${i}`}
                positions={[t.from, t.to]}
                pathOptions={{ color: '#9ca3af', weight: 3, dashArray: '8, 8', opacity: 0.7 }}
              />
            ))}
            {/* Walking leg lines (street-level paths) */}
            {routeData.walkingLines.map((wl, i) => (
              <Polyline
                key={`walk-${i}`}
                positions={wl.positions}
                pathOptions={{ color: '#6b7280', weight: 3, dashArray: '6, 8', opacity: 0.7 }}
              />
            ))}
            {/* Stop markers with labels */}
            {routeData.stops.map((stop, i) => (
              <CircleMarker
                key={`stop-${i}`}
                center={stop.position}
                radius={4}
                pathOptions={{
                  color: stop.color,
                  fillColor: dark ? '#1a1a1a' : '#ffffff',
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                {showLabels ? (
                  <Tooltip permanent direction="right" offset={[8, 0]} className="station-label">
                    <span style={tooltipStyle}>{stop.name}</span>
                  </Tooltip>
                ) : (
                  <Tooltip direction="top" offset={[0, -6]} className="station-label">
                    <span style={tooltipStyle}>{stop.name}</span>
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
            {/* Origin pin */}
            <Marker
              position={routeData.origin.position}
              icon={originPinIcon}
              draggable
              eventHandlers={{ dragend: (e) => handlePinDragEnd('origin', e) }}
            >
              <Tooltip permanent direction="top" offset={[0, 0]} className="station-label">
                <span style={tooltipStyle}>{routeData.origin.name}</span>
              </Tooltip>
            </Marker>
            {/* Destination pin */}
            <Marker
              position={routeData.destination.position}
              icon={destinationPinIcon}
              draggable
              eventHandlers={{ dragend: (e) => handlePinDragEnd('destination', e) }}
            >
              <Tooltip permanent direction="top" offset={[0, 0]} className="station-label">
                <span style={tooltipStyle}>{routeData.destination.name}</span>
              </Tooltip>
            </Marker>
          </>
        )}

        {/* Line overlay */}
        {lineData && (
          <>
            {lineData.branches.map((branch, i) => (
              <Polyline
                key={`branch-${i}`}
                positions={branch}
                pathOptions={{ color: lineData.color, weight: 5, opacity: 0.9 }}
              />
            ))}
            {lineData.stations.map((station) => (
              <CircleMarker
                key={station.id}
                center={[station.latitude, station.longitude]}
                radius={5}
                pathOptions={{
                  color: lineData.color,
                  fillColor: dark ? '#1a1a1a' : '#ffffff',
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                {showLabels ? (
                  <Tooltip permanent direction="right" offset={[8, 0]} className="station-label">
                    <span style={tooltipStyle}>{station.name}</span>
                  </Tooltip>
                ) : (
                  <Tooltip direction="top" offset={[0, -6]} className="station-label">
                    <span style={tooltipStyle}>{station.name}</span>
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
          </>
        )}

        {/* Community report markers */}
        <ReportMapMarkers />

        {/* Preview pins (shown before route search) */}
        {!routeData && previewPins.map((pin) => (
          <Marker
            key={`preview-${pin.type}`}
            position={[pin.lat, pin.lng]}
            icon={pin.type === 'origin' ? originPinIcon : destinationPinIcon}
            draggable
            eventHandlers={{ dragend: (e) => handlePinDragEnd(pin.type, e) }}
          >
            <Tooltip permanent direction="top" offset={[0, 0]} className="station-label">
              <span style={tooltipStyle}>{pin.label}</span>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
