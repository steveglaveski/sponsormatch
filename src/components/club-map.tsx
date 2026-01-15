"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Club {
  id: string;
  name: string;
  sport: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
}

interface ClubMapProps {
  clubs: Club[];
  centerLat: number;
  centerLng: number;
  onClubSelect?: (clubId: string) => void;
}

declare global {
  interface Window {
    initMap: () => void;
  }
}

export function ClubMap({
  clubs,
  centerLat,
  centerLng,
  onClubSelect,
}: ClubMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    document.head.appendChild(script);

    return () => {
      // Cleanup if component unmounts before script loads
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || map) return;

    const newMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 12,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Add center marker (user's location)
    new window.google.maps.Marker({
      position: { lat: centerLat, lng: centerLng },
      map: newMap,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#3B82F6",
        fillOpacity: 1,
        strokeColor: "#1D4ED8",
        strokeWeight: 2,
      },
      title: "Search Location",
    });

    setMap(newMap);
  }, [mapLoaded, centerLat, centerLng, map]);

  // Add club markers
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: centerLat, lng: centerLng });

    clubs.forEach((club) => {
      if (!club.latitude || !club.longitude) return;

      const marker = new window.google.maps.Marker({
        position: { lat: club.latitude, lng: club.longitude },
        map,
        title: club.name,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#059669",
          strokeWeight: 1,
        },
      });

      marker.addListener("click", () => {
        setSelectedClub(club);
        if (onClubSelect) {
          onClubSelect(club.id);
        }
      });

      newMarkers.push(marker);
      bounds.extend({ lat: club.latitude, lng: club.longitude });
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (clubs.length > 0) {
      map.fitBounds(bounds);
      // Don't zoom in too much
      const listener = window.google.maps.event.addListener(
        map,
        "idle",
        () => {
          const zoom = map.getZoom();
          if (zoom && zoom > 15) {
            map.setZoom(15);
          }
          window.google.maps.event.removeListener(listener);
        }
      );
    }
  }, [map, clubs, centerLat, centerLng, mapLoaded, onClubSelect]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-neutral-500">
            <p>{error}</p>
            <p className="text-sm mt-2">
              Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map view
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-lg border bg-neutral-100"
      />

      {/* Selected club info overlay */}
      {selectedClub && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 shadow-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{selectedClub.name}</h3>
                {selectedClub.sport && (
                  <p className="text-sm text-neutral-500">{selectedClub.sport}</p>
                )}
                <p className="text-sm text-neutral-600 mt-1">
                  {selectedClub.distanceKm.toFixed(1)} km away
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClub(null)}
              >
                ×
              </Button>
            </div>
            <Button
              className="w-full mt-3"
              size="sm"
              onClick={() => onClubSelect?.(selectedClub.id)}
            >
              View Sponsors
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-700" />
          <span>Your location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600" />
          <span>Sports clubs</span>
        </div>
      </div>
    </div>
  );
}
