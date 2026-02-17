import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import type { RouteResult } from '../types';

interface RouteMapProps {
  route: RouteResult;
}

function FitBounds({ route }: { route: RouteResult }) {
  const map = useMap();

  useEffect(() => {
    const allPoints: LatLngTuple[] = [];
    for (const seg of route.segments) {
      for (const stop of seg.stops) {
        allPoints.push([stop.lat, stop.lng]);
      }
    }
    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [40, 40] });
    }
  }, [route, map]);

  return null;
}

function useDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export default function RouteMap({ route }: RouteMapProps) {
  const dark = useDarkMode();

  const allPoints = useMemo(() => {
    const points: LatLngTuple[] = [];
    for (const seg of route.segments) {
      for (const stop of seg.stops) {
        points.push([stop.lat, stop.lng]);
      }
    }
    return points;
  }, [route]);

  const transferLines = useMemo(() => {
    const lines: { from: LatLngTuple; to: LatLngTuple }[] = [];
    for (let i = 1; i < route.segments.length; i++) {
      const prevStops = route.segments[i - 1].stops;
      const lastStop = prevStops[prevStops.length - 1];
      const firstStop = route.segments[i].stops[0];
      lines.push({
        from: [lastStop.lat, lastStop.lng],
        to: [firstStop.lat, firstStop.lng],
      });
    }
    return lines;
  }, [route]);

  if (allPoints.length === 0) return null;

  const center = allPoints[0];
  const origin = allPoints[0];
  const destination = allPoints[allPoints.length - 1];

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = dark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 350, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
        />
        <FitBounds route={route} />

        {route.segments.map((seg, i) => {
          const positions: LatLngTuple[] = seg.stops.map((s) => [s.lat, s.lng]);
          return (
            <Polyline
              key={`${seg.lineCode}-${i}`}
              positions={positions}
              pathOptions={{ color: seg.lineColor, weight: 5, opacity: 0.9 }}
            />
          );
        })}

        {transferLines.map((t, i) => (
          <Polyline
            key={`t-${i}`}
            positions={[t.from, t.to]}
            pathOptions={{ color: '#9ca3af', weight: 3, dashArray: '8, 8', opacity: 0.7 }}
          />
        ))}

        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1, weight: 3 }}
        />

        <CircleMarker
          center={destination}
          radius={8}
          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
        />
      </MapContainer>
    </div>
  );
}
