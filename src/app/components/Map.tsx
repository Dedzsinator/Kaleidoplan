import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';

interface MapMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

interface MapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: MapMarker[];
  style?: React.CSSProperties;
}

interface LeafletIconDefaultExtended extends L.Icon.Default {
  _getIconUrl?: () => string;
}

const fixLeafletIcons = (() => {
  let fixed = false;
  return () => {
    if (fixed) return;

    delete (L.Icon.Default.prototype as LeafletIconDefaultExtended)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    fixed = true;
  };
})();

const getZoomLevel = (latitudeDelta: number): number => {
  return Math.round(Math.log2(360 / latitudeDelta)) - 1;
};

const StableLeafletMap: React.FC<MapProps> = ({ region, markers = [], style }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const memoizedRegion = useMemo(
    () => ({
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta || 0.01,
      longitudeDelta: region.longitudeDelta || 0.01,
    }),
    [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta],
  );

  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    if (markers.length > 0) {
      markers.forEach((marker) => {
        if (isNaN(marker.coordinate.latitude) || isNaN(marker.coordinate.longitude)) return;

        const m = L.marker([marker.coordinate.latitude, marker.coordinate.longitude]);

        if (marker.title || marker.description) {
          let content = '';
          if (marker.title) content += `<strong>${marker.title}</strong>`;
          if (marker.title && marker.description) content += '<br>';
          if (marker.description) content += marker.description;

          m.bindPopup(content);
        }

        m.addTo(mapInstanceRef.current!);
        markersRef.current.push(m);
      });
    } else {
      // Add default marker at center
      const m = L.marker([memoizedRegion.latitude, memoizedRegion.longitude]).bindPopup('Event location');

      m.addTo(mapInstanceRef.current);
      markersRef.current.push(m);
    }
  }, [markers, memoizedRegion.latitude, memoizedRegion.longitude]);

  // Initialize the map just once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix Leaflet icons before creating map
    fixLeafletIcons();

    // We'll use a persistent reference to the container
    const mapContainer = mapRef.current;

    // Create map with a short delay to ensure container is ready
    const initTimer = setTimeout(() => {
      try {
        // Calculate zoom level
        const zoom = memoizedRegion.latitudeDelta ? getZoomLevel(memoizedRegion.latitudeDelta) : 13;

        // Create map
        const map = L.map(mapContainer, {
          center: [memoizedRegion.latitude, memoizedRegion.longitude],
          zoom,
          scrollWheelZoom: true,
          dragging: true,
          doubleClickZoom: true,
          zoomControl: true,
        });

        // Add tile layer (stable OpenStreetMap CDN)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Add scale
        L.control.scale({ imperial: false }).addTo(map);

        // Store map instance
        mapInstanceRef.current = map;

        // Force a resize and mark as loaded
        map.invalidateSize();
        setIsLoaded(true);

        // Initialize markers
        updateMarkers();
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoaded(false);
      }
    }, 100); // Short timeout

    // Cleanup only if component truly unmounts
    return () => {
      clearTimeout(initTimer);

      if (mapInstanceRef.current && !document.body.contains(mapContainer)) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [
    mapRef,
    memoizedRegion.latitude,
    memoizedRegion.longitude,
    memoizedRegion.latitudeDelta,
    memoizedRegion.longitudeDelta,
    updateMarkers,
    markers,
  ]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    mapInstanceRef.current.setView([memoizedRegion.latitude, memoizedRegion.longitude]);
  }, [memoizedRegion.latitude, memoizedRegion.longitude, isLoaded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;
    updateMarkers();
  }, [markers, isLoaded, updateMarkers]);

  return (
    <div className="map-wrapper" style={style}>
      <div ref={mapRef} className="map-container"></div>
      {!isLoaded && (
        <div className="map-loading">
          <div className="map-loading-spinner"></div>
          <div className="map-loading-text">Loading map...</div>
        </div>
      )}
    </div>
  );
};

const Map: React.FC<MapProps> = (props) => {
  if (
    !props.region ||
    typeof props.region.latitude !== 'number' ||
    typeof props.region.longitude !== 'number' ||
    isNaN(props.region.latitude) ||
    isNaN(props.region.longitude)
  ) {
    return (
      <div className="map-error" style={props.style}>
        <p>Invalid map coordinates</p>
      </div>
    );
  }

  return <StableLeafletMap {...props} />;
};

export default React.memo(Map);
