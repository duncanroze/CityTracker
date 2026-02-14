import { useEffect } from 'react';
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

export default function RouteMap({ route }: RouteMapProps) {
  const allPoints: LatLngTuple[] = [];
  for (const seg of route.segments) {
    for (const stop of seg.stops) {
      allPoints.push([stop.lat, stop.lng]);
    }
  }

  if (allPoints.length === 0) return null;

  const center = allPoints[0];

  // Build transfer lines (dashed gray between segments)
  const transferLines: { from: LatLngTuple; to: LatLngTuple }[] = [];
  for (let i = 1; i < route.segments.length; i++) {
    const prevStops = route.segments[i - 1].stops;
    const lastStop = prevStops[prevStops.length - 1];
    const firstStop = route.segments[i].stops[0];
    transferLines.push({
      from: [lastStop.lat, lastStop.lng],
      to: [firstStop.lat, firstStop.lng],
    });
  }

  // Origin and destination
  const origin = allPoints[0];
  const destination = allPoints[allPoints.length - 1];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 350, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds route={route} />

        {/* Segment polylines */}
        {route.segments.map((seg, i) => {
          const positions: LatLngTuple[] = seg.stops.map((s) => [s.lat, s.lng]);
          return (
            <Polyline
              key={i}
              positions={positions}
              pathOptions={{ color: seg.lineColor, weight: 5, opacity: 0.9 }}
            />
          );
        })}

        {/* Transfer dashed lines */}
        {transferLines.map((t, i) => (
          <Polyline
            key={`t-${i}`}
            positions={[t.from, t.to]}
            pathOptions={{ color: '#9ca3af', weight: 3, dashArray: '8, 8', opacity: 0.7 }}
          />
        ))}

        {/* Origin marker */}
        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 1, weight: 3 }}
        />

        {/* Destination marker */}
        <CircleMarker
          center={destination}
          radius={8}
          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
        />
      </MapContainer>
    </div>
  );
}
