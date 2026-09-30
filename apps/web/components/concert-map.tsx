'use client';

import { useEffect, useRef, useState } from 'react';
import { usePreferences } from './preferences-provider';

export type AtlasMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  artist: string;
  city: string;
  accent: string;
  approximate?: boolean;
};

export function ConcertMap({
  points,
  selectedId,
  onSelect,
}: {
  points: AtlasMapPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { theme, t } = usePreferences();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const initialThemeRef = useRef(theme);
  const mapThemeRef = useRef(theme);
  const markersRef = useRef<Array<{ id: string; marker: import('maplibre-gl').Marker; element: HTMLButtonElement }>>([]);
  const onSelectRef = useRef(onSelect);
  const [readyVersion, setReadyVersion] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void import('maplibre-gl').then((module) => {
      if (cancelled || !containerRef.current) return;
      const maplibregl = module;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: `https://tiles.openfreemap.org/styles/${initialThemeRef.current === 'dark' ? 'dark' : 'positron'}`,
        center: [112, 18],
        zoom: 2.55,
        minZoom: 1.5,
        maxZoom: 14,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.on('load', () => setReadyVersion((value) => value + 1));
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapThemeRef.current === theme) return;
    mapThemeRef.current = theme;
    map.setStyle(`https://tiles.openfreemap.org/styles/${theme === 'dark' ? 'dark' : 'positron'}`);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyVersion) return;
    let disposed = false;

    void import('maplibre-gl').then((module) => {
      if (disposed || !mapRef.current) return;
      const maplibregl = module;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = points.map((point) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = `concert-map-marker${point.approximate ? ' approximate' : ''}`;
        element.style.setProperty('--marker-color', point.accent);
        element.setAttribute('aria-label', `${point.artist} · ${point.city}${point.approximate ? ' ≈' : ''}`);
        element.title = `${point.artist} · ${point.city}${point.approximate ? ' ≈' : ''}`;
        const dot = document.createElement('span');
        const label = document.createElement('strong');
        label.textContent = point.artist;
        element.append(dot, label);
        element.addEventListener('click', () => {
          onSelectRef.current(point.id);
          mapRef.current?.easeTo({ center: [point.longitude, point.latitude], zoom: Math.max(mapRef.current.getZoom(), 4.5), duration: 550 });
        });
        const marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
        return { id: point.id, marker, element };
      });

      if (points.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
        map.fitBounds(bounds, { padding: 76, maxZoom: 5.6, duration: 650 });
      } else if (points[0]) {
        map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 5, duration: 650 });
      }
    });

    return () => {
      disposed = true;
    };
  }, [points, readyVersion]);

  useEffect(() => {
    markersRef.current.forEach(({ id, element }) => {
      element.classList.toggle('is-selected', id === selectedId);
    });
  }, [selectedId]);

  return <div className="concert-map" ref={containerRef} role="region" aria-label={t('atlas.mapLabel')} />;
}
