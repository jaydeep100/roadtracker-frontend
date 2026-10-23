import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Road Defect Warning Icon (Yellow & Black caution sign)
function createDefectIcon(isFocused = false) {
  const size = isFocused ? 36 : 28;
  const fill = isFocused ? "#fde047" : "#facc15";
  const glow = isFocused
    ? "filter: drop-shadow(0 0 10px #facc15) drop-shadow(0 3px 6px rgba(0,0,0,0.9));"
    : "filter: drop-shadow(0 2px 5px rgba(0,0,0,0.85));";

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${glow}">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#000000" stroke-width="2.6"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#000000" stroke-width="2.6"/>
    </svg>
  `;

  return L.divIcon({
    className: `road-defect-icon ${isFocused ? "focused-defect-marker" : ""}`,
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Origin/Selected Location Pin (Yellow & Black Pin)
function createOriginPinIcon() {
  const svg = `
    <svg width="34" height="34" viewBox="0 0 24 24" fill="#facc15" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 8px rgba(250, 204, 21, 0.75));">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3.2" fill="#000000"/>
    </svg>
  `;

  return L.divIcon({
    className: "road-picker-pin",
    html: svg,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

// Map click event listener to set coordinates
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
    },
  });
  return null;
}

// Map controller to invalidate size on mount/resize and fly to coordinates
function MapController({ focusCoords, heightMode }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map, heightMode]);

  useEffect(() => {
    if (focusCoords && Number.isFinite(focusCoords.lat) && Number.isFinite(focusCoords.lon)) {
      map.flyTo([focusCoords.lat, focusCoords.lon], focusCoords.zoom || 16, {
        duration: 1.2,
      });
    }
  }, [focusCoords, map]);

  return null;
}

export default function RoadMap({
  position,
  onLocationSelect,
  defects = [],
  radius = 500,
  showRadius = true,
  focusCoords = null,
  focusedDefectId = null,
  onSelectDefect = () => {},
}) {
  const [mapStyle, setMapStyle] = useState("dark"); // "dark" | "street"
  const [isExpanded, setIsExpanded] = useState(false); // compact (280px) vs expanded (380px)
  const markerRefs = useRef({});

  const validLat = Number.isFinite(Number(position?.lat)) ? Number(position.lat) : 23.1815;
  const validLon = Number.isFinite(Number(position?.lon)) ? Number(position.lon) : 79.9864;
  const selectedPosition = [validLat, validLon];

  // Auto-open popup when a specific defect is focused
  useEffect(() => {
    if (focusedDefectId && markerRefs.current[focusedDefectId]) {
      markerRefs.current[focusedDefectId].openPopup();
    }
  }, [focusedDefectId]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        alert(`Location unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const mapHeight = isExpanded ? "380px" : "280px";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl">
      {/* Top Map Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
          <span className="font-bold text-yellow-400">Map Telemetry</span>
          <span className="hidden sm:inline text-zinc-600">·</span>
          <span className="hidden sm:inline text-zinc-400">
            Click map to set pin
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Map Style Toggle */}
          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === "dark" ? "street" : "dark"))}
            title="Toggle map style"
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:border-yellow-400 hover:text-yellow-400 transition-colors shadow-sm font-medium"
          >
            <span>{mapStyle === "dark" ? "🌙 Dark" : "☀️ Street"}</span>
          </button>

          {/* Map Size Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((e) => !e)}
            title="Toggle map size"
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:border-yellow-400 hover:text-yellow-400 transition-colors shadow-sm font-medium"
          >
            <span>{isExpanded ? "🗗 Compact" : "⛶ Expand"}</span>
          </button>

          {/* Locate Me */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200 hover:border-yellow-400 hover:text-yellow-400 transition-colors shadow-sm font-medium"
          >
            <span>📍</span>
            <span>My Location</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={() => onLocationSelect({ lat: 23.1815, lon: 79.9864 })}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-400 hover:border-yellow-400 hover:text-yellow-400 transition-colors shadow-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Reduced Map Container */}
      <div style={{ height: mapHeight, width: "100%", position: "relative", transition: "height 0.2s ease" }}>
        <MapContainer
          center={selectedPosition}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          {mapStyle === "dark" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          <MapClickHandler onLocationSelect={onLocationSelect} />
          <MapController focusCoords={focusCoords} heightMode={mapHeight} />

          {/* Search Radius Circle in Yellow */}
          {showRadius && Number(radius) > 0 && (
            <Circle
              center={selectedPosition}
              radius={Number(radius)}
              pathOptions={{
                color: "#facc15",
                fillColor: "#eab308",
                fillOpacity: 0.12,
                weight: 2,
                dashArray: "6, 6",
              }}
            />
          )}

          {/* Selected Location Pin Marker */}
          <Marker position={selectedPosition} icon={createOriginPinIcon()}>
            <Popup>
              <div className="space-y-1.5 text-zinc-200">
                <div className="flex items-center gap-1.5 border-b border-zinc-700/80 pb-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <p className="font-bold text-yellow-400 text-xs">Selected Location</p>
                </div>
                <p className="font-mono text-xs text-zinc-300">
                  {validLat.toFixed(6)}, {validLon.toFixed(6)}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Ready to report defect or search nearby.
                </p>
                <a
                  href={`https://www.google.com/maps?q=${validLat},${validLon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center justify-center gap-1 w-full rounded border border-yellow-500/40 bg-yellow-400/10 py-1 text-center text-[10px] font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  <span>Open in Google Maps</span>
                  <span>↗</span>
                </a>
              </div>
            </Popup>
          </Marker>

          {/* Plotted Defect Markers from Backend */}
          {defects.map((defect) => {
            const lat = Number(defect.latitude);
            const lon = Number(defect.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const isFocused = focusedDefectId === defect.id;
            const distance = defect.distance_metres ?? defect.distance ?? defect.distanceMetres;

            return (
              <Marker
                key={defect.id || `${lat}-${lon}`}
                position={[lat, lon]}
                icon={createDefectIcon(isFocused)}
                ref={(ref) => {
                  if (ref) {
                    markerRefs.current[defect.id] = ref;
                  }
                }}
                eventHandlers={{
                  click: () => onSelectDefect(defect),
                }}
              >
                <Popup>
                  <div className="min-w-[190px] space-y-1.5 text-zinc-200">
                    <div className="flex items-center justify-between border-b border-zinc-700/80 pb-1">
                      <span className="font-bold text-yellow-400 text-xs">
                        Defect #{defect.id}
                      </span>
                      {distance != null && (
                        <span className="rounded border border-yellow-500/40 bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                          {Number(distance).toFixed(0)}m away
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-100 font-semibold">
                      {defect.description}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      {lat.toFixed(6)}, {lon.toFixed(6)}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => onLocationSelect({ lat, lon })}
                        className="rounded bg-zinc-800 border border-zinc-700 py-1 text-center text-[10px] font-semibold text-zinc-300 hover:border-yellow-400 hover:text-yellow-400 transition-colors"
                      >
                        Set as Pin
                      </button>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded border border-yellow-500/40 bg-yellow-400/10 py-1 text-center text-[10px] font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
                      >
                        <span>G-Maps</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Bottom Coordinates Bar */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2 font-mono text-xs text-zinc-400">
        <div>
          Selected Pin:{" "}
          <span className="font-bold text-yellow-400">
            {validLat.toFixed(6)}, {validLon.toFixed(6)}
          </span>
        </div>
        <div className="text-zinc-500 font-sans text-[11px]">
          <span className="text-yellow-400 font-semibold">{defects.length}</span> defect(s) on map
        </div>
      </div>
    </div>
  );
}
