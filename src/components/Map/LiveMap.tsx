import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function LiveMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.08, 4.61], // Bogotá
      zoom: 12,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-xl overflow-hidden"
    />
  );
}
