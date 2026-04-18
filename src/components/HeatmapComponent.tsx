import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usePatientStore } from '../contexts/PatientStore';

const HeatmapComponent: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const { patients, recordings } = usePatientStore();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on India (center: 20.5937°N, 78.9629°E)
    if (!mapRef.current) {
      try {
        mapRef.current = L.map(mapContainerRef.current, {
          attributionControl: true,
        }).setView([20.5937, 78.9629], 5);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 1,
        }).addTo(mapRef.current);
      } catch (err) {
        console.error('Failed to initialize map:', err);
        return;
      }
    }

    // Clear previous markers
    markersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Calculate heatmap data from patients and recordings
    const patientsWithLocation = patients.filter(
      (p) => p.latitude !== undefined && p.longitude !== undefined
    );

    const heatmapData = patientsWithLocation.map((p) => ({
      latitude: p.latitude!,
      longitude: p.longitude!,
      intensity: recordings.filter((r) => r.patientId === p.id).length,
    }));

    // Add new markers with color intensity based on recording count
    heatmapData.forEach((point) => {
      const intensity = Math.min(point.intensity, 10); // Cap at 10 for color mapping
      const hue = 240 - intensity * 20; // Blue (240°) to Red (0°)
      const color = `hsl(${hue}, 100%, 50%)`;

      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 5 + intensity * 2,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.7,
        fillOpacity: 0.6,
      })
        .bindPopup(
          `<div style="font-size: 12px">
            <strong>Recordings:</strong> ${point.intensity}<br>
            <strong>Latitude:</strong> ${point.latitude.toFixed(4)}<br>
            <strong>Longitude:</strong> ${point.longitude.toFixed(4)}
          </div>`
        )
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [patients, recordings]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        backgroundColor: '#1a1a2e',
      }}
    />
  );
};

export default HeatmapComponent;
