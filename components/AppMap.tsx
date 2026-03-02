'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import { useMapContext } from '@/contexts/MapContext';

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
      for (const seg of overlay.route.segments) {
        for (const stop of seg.stops) {
          points.push([stop.lat, stop.lng]);
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

function MapClickHandler() {
  const { overlay, setLastMapClick } = useMapContext();
  useMapEvents({
    click(e) {
      // Only handle clicks when no route/line overlay is active
      if (overlay.type !== 'none') return;
      setLastMapClick({ lat: e.latlng.lat, lng: e.latlng.lng, ts: Date.now() });
    },
  });
  return null;
}

export default function AppMap() {
  const { overlay, dark, previewPins } = useMapContext();

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

  // Route overlays
  const routeData = useMemo(() => {
    if (overlay.type !== 'route' || !overlay.route) return null;
    const route = overlay.route;

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

    // Walking legs
    const walkingLines: { from: LatLngTuple; to: LatLngTuple; label: string }[] = [];
    let walkFromPin: { position: LatLngTuple; name: string } | null = null;
    let walkToPin: { position: LatLngTuple; name: string } | null = null;

    if (route.walkingFrom) {
      const wf = route.walkingFrom;
      walkFromPin = { position: [wf.lat, wf.lng], name: wf.address.split(',')[0] };
      walkingLines.push({
        from: [wf.lat, wf.lng],
        to: [wf.stationLat, wf.stationLng],
        label: `${Math.round(wf.durationSeconds / 60)} min`,
      });
    }
    if (route.walkingTo) {
      const wt = route.walkingTo;
      walkToPin = { position: [wt.lat, wt.lng], name: wt.address.split(',')[0] };
      walkingLines.push({
        from: [wt.stationLat, wt.stationLng],
        to: [wt.lat, wt.lng],
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
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer key={dark ? 'dark' : 'light'} attribution={tileAttribution} url={tileUrl} />
        <MapController onZoomChange={setZoom} />
        <MapClickHandler />

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
            {/* Walking leg lines */}
            {routeData.walkingLines.map((wl, i) => (
              <Polyline
                key={`walk-${i}`}
                positions={[wl.from, wl.to]}
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
            {/* Origin marker */}
            <CircleMarker
              center={routeData.origin.position}
              radius={8}
              pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1, weight: 3 }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]} className="station-label">
                <span style={tooltipStyle}>{routeData.origin.name}</span>
              </Tooltip>
            </CircleMarker>
            {/* Destination marker */}
            <CircleMarker
              center={routeData.destination.position}
              radius={8}
              pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]} className="station-label">
                <span style={tooltipStyle}>{routeData.destination.name}</span>
              </Tooltip>
            </CircleMarker>
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

        {/* Preview pins (shown before route search) */}
        {!routeData && previewPins.map((pin) => (
          <CircleMarker
            key={`preview-${pin.type}`}
            center={[pin.lat, pin.lng]}
            radius={8}
            pathOptions={{
              color: pin.type === 'origin' ? '#16a34a' : '#dc2626',
              fillColor: pin.type === 'origin' ? '#22c55e' : '#ef4444',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="station-label">
              <span style={tooltipStyle}>{pin.label}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
