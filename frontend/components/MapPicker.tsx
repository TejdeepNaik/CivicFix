"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default icon issue with Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

function RecenterMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    if (latitude && longitude) {
      map.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude, map]);
  return null;
}

function LocationMarker({ position, setPosition }: { position: L.LatLng | null; setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          setPosition(marker.getLatLng());
        },
      }}
    ></Marker>
  );
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    latitude && longitude ? new L.LatLng(latitude, longitude) : null
  );

  // Use a ref or simple flag to prevent calling onChange on initial mount if not changed by user
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady && position) {
      onChange(position.lat, position.lng);
    }
    setIsReady(true);
  }, [position]);

  // Update internal state if props change (e.g. from preset buttons or geolocation)
  useEffect(() => {
    if (latitude && longitude && (!position || position.lat !== latitude || position.lng !== longitude)) {
      setPosition(new L.LatLng(latitude, longitude));
    }
  }, [latitude, longitude]);

  const defaultCenter: L.LatLngTuple = latitude && longitude ? [latitude, longitude] : [12.9716, 77.5946];

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-300 shadow-inner max-w-full" style={{ zIndex: 0 }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap latitude={latitude} longitude={longitude} />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
