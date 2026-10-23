import { useEffect } from "react";
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

// Clean defect pin marker (Red warning indicator)
function createDefectIcon() {
  const svg = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" stroke-width="2.5"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="2.5"/>
    </svg>
  `;

  return L.divIcon({
    className: "road-defect-icon",
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

// Clean origin pin marker (Blue location pin)
function createOriginPinIcon() {
  const svg = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#2563eb" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 5px rgba(37,99,235,0.35));">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3" fill="#ffffff"/>
    </svg>
  `;

  return L.divIcon({
    className: "road-picker-pin",
    html: svg,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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

// Map controller to invalidate size on mount and fly to selected defect
function MapController({ focusCoords }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (focusCoords && Number.isFinite(focusCoords.lat) && Number.isFinite(focusCoords.lon)) {
      map.flyTo([focusCoords.lat, focusCoords.lon], 16, { duration: 1 });
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
  onSelectDefect = () => {},
}) {
  const validLat = Number.isFinite(Number(position?.lat)) ? Number(position.lat) : 23.1815;
  const validLon = Number.isFinite(Number(position?.lon)) ? Number(position.lon) : 79.9864;
  const selectedPosition = [validLat, validLon];

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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Top Map Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50/90 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-600" />
          <span className="font-semibold text-gray-800">Map View</span>
          <span className="hidden sm:inline text-gray-400">·</span>
          <span className="hidden sm:inline text-gray-500">
            Click map to pick pin coordinates
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-700 hover:bg-gray-100 transition-colors shadow-2xs font-medium"
          >
            <span>📍</span>
            <span>My Location</span>
          </button>

          <button
            type="button"
            onClick={() => onLocationSelect({ lat: 23.1815, lon: 79.9864 })}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-100 transition-colors shadow-2xs font-medium"
          >
            Reset Pin
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ height: "420px", width: "100%", position: "relative" }}>
        <MapContainer
          center={selectedPosition}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapClickHandler onLocationSelect={onLocationSelect} />
          <MapController focusCoords={focusCoords} />

          {/* Search Radius Circle */}
          {showRadius && Number(radius) > 0 && (
            <Circle
              center={selectedPosition}
              radius={Number(radius)}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: "5, 5",
              }}
            />
          )}

          {/* Selected Location Pin Marker */}
          <Marker position={selectedPosition} icon={createOriginPinIcon()}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-blue-600 text-xs">Selected Map Pin</p>
                <p className="font-mono text-xs text-gray-700">
                  {validLat.toFixed(6)}, {validLon.toFixed(6)}
                </p>
                <p className="text-[11px] text-gray-500">
                  Ready to report a defect or search nearby.
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Plotted Defect Markers from Backend */}
          {defects.map((defect) => {
            const lat = Number(defect.latitude);
            const lon = Number(defect.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const distance = defect.distance_metres ?? defect.distance ?? defect.distanceMetres;

            return (
              <Marker
                key={defect.id || `${lat}-${lon}`}
                position={[lat, lon]}
                icon={createDefectIcon()}
                eventHandlers={{
                  click: () => onSelectDefect(defect),
                }}
              >
                <Popup>
                  <div className="min-w-[170px] space-y-1.5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                      <span className="font-bold text-red-600 text-xs">
                        Defect #{defect.id}
                      </span>
                      {distance != null && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100">
                          {Number(distance).toFixed(0)}m away
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-800 font-medium">
                      {defect.description}
                    </p>
                    <p className="font-mono text-[10px] text-gray-500">
                      {lat.toFixed(6)}, {lon.toFixed(6)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onLocationSelect({ lat, lon })}
                      className="mt-1 w-full rounded bg-gray-100 py-1 text-center text-[10px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Set as Pin Location
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Bottom Coordinates Bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 font-mono text-xs text-gray-600">
        <div>
          Selected Pin:{" "}
          <span className="font-semibold text-gray-900">
            {validLat.toFixed(6)}, {validLon.toFixed(6)}
          </span>
        </div>
        <div className="text-gray-500 font-sans text-[11px]">
          {defects.length} defect(s) on map
        </div>
      </div>
    </div>
  );
}
