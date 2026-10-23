import { useEffect, useState } from "react";
import RoadMap from "./components/RoadMap";
import {
  getDefects,
  addDefect,
  searchNearby,
  DEFAULT_API_URL,
} from "./services/defectApi";

const RADIUS_PRESETS = [100, 250, 500, 1000, 2000];

function App() {
  const [defects, setDefects] = useState([]);
  const [nearbyDefects, setNearbyDefects] = useState(null);

  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("23.181500");
  const [longitude, setLongitude] = useState("79.986400");
  const [radius, setRadius] = useState("500");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [backendConnected, setBackendConnected] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [focusCoords, setFocusCoords] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch defects directly from backend
  async function loadDefects() {
    setLoading(true);
    setError("");

    try {
      const data = await getDefects(DEFAULT_API_URL);
      setDefects(data);
      setBackendConnected(true);
    } catch (err) {
      setBackendConnected(false);
      setDefects([]);
      setError(
        `Unable to reach backend at ${DEFAULT_API_URL}: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    getDefects(DEFAULT_API_URL)
      .then((data) => {
        if (!ignore) {
          setDefects(data);
          setBackendConnected(true);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setBackendConnected(false);
          setDefects([]);
          setError(
            `Unable to reach backend at ${DEFAULT_API_URL}: ${err.message}`
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Map click handler to update coordinates
  function handleLocationSelect({ lat, lon }) {
    setLatitude(lat.toFixed(6));
    setLongitude(lon.toFixed(6));
    setError("");
  }

  // Add new defect to backend
  async function handleAddDefect(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!description.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Please enter a valid description and coordinates.");
      setSaving(false);
      return;
    }

    try {
      await addDefect(DEFAULT_API_URL, {
        description: description.trim(),
        latitude: lat,
        longitude: lon,
      });

      setMessage("Defect reported successfully to backend.");
      setDescription("");
      setNearbyDefects(null);
      await loadDefects();
    } catch (err) {
      setError(`Failed to save defect: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Search nearby defects from backend
  async function handleNearbySearch(e) {
    e.preventDefault();
    setSearching(true);
    setError("");
    setMessage("");

    const lat = Number(latitude);
    const lon = Number(longitude);
    const dist = Number(radius);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(dist) || dist <= 0) {
      setError("Please provide valid coordinates and a positive radius.");
      setSearching(false);
      return;
    }

    try {
      const results = await searchNearby(DEFAULT_API_URL, {
        lat,
        lon,
        radius: dist,
      });

      setNearbyDefects(results);
      setMessage(
        `Found ${results.length} defect(s) within ${dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist}m`}.`
      );
    } catch (err) {
      setError(`Nearby search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  }

  // Focus map on a selected defect
  function handleFocusDefect(defect) {
    const lat = Number(defect.latitude);
    const lon = Number(defect.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setFocusCoords({ lat, lon });
      setLatitude(lat.toFixed(6));
      setLongitude(lon.toFixed(6));
    }
  }

  // Copy coordinates
  function handleCopyCoords() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${latitude}, ${longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const displayedDefects = nearbyDefects !== null ? nearbyDefects : defects;

  const filteredDefects = displayedDefects.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (d.description && d.description.toLowerCase().includes(q)) ||
      String(d.id).includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-sm">
              📍
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                Road Tracker
              </h1>
              <p className="text-xs text-gray-500">
                Civil Road Defect Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Backend Status Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                backendConnected === true
                  ? "border-green-200 bg-green-50 text-green-700"
                  : backendConnected === false
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  loading
                    ? "bg-amber-400 animate-pulse"
                    : backendConnected === true
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span>
                {loading
                  ? "Connecting..."
                  : backendConnected === true
                  ? "Backend Connected"
                  : "Backend Offline"}
              </span>
            </span>

            {/* Reload button */}
            <button
              type="button"
              onClick={loadDefects}
              disabled={loading}
              title="Reload from backend"
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50 shadow-2xs"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span className="hidden sm:inline">{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* Error Notification */}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Make sure your Spring Boot backend is running on{" "}
                  <code className="bg-red-100 px-1 py-0.5 rounded font-mono text-[11px]">
                    {DEFAULT_API_URL}
                  </code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDefects}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-2xs"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-800 font-bold px-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {message && (
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs sm:text-sm text-green-800">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>{message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="text-green-600 hover:text-green-800 font-bold px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Info Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Defects
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {defects.length}
            </p>
            <p className="text-[11px] text-gray-500">
              Loaded directly from backend
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Current View
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900 truncate">
              {nearbyDefects !== null
                ? `Nearby (${nearbyDefects.length} found)`
                : "All Defects"}
            </p>
            <p className="text-[11px] text-gray-500">
              {nearbyDefects !== null
                ? `Filtered by ${Number(radius) >= 1000 ? `${(Number(radius) / 1000).toFixed(1)} km` : `${radius}m`} radius`
                : "Displaying full registry"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Selected Pin
              </p>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-gray-900 truncate">
              {latitude}, {longitude}
            </p>
            <p className="text-[11px] text-gray-500">
              Click anywhere on map to change
            </p>
          </div>
        </section>

        {/* Map Section */}
        <section>
          <RoadMap
            position={{
              lat: Number(latitude),
              lon: Number(longitude),
            }}
            onLocationSelect={handleLocationSelect}
            defects={displayedDefects}
            radius={Number(radius)}
            showRadius={true}
            focusCoords={focusCoords}
            onSelectDefect={handleFocusDefect}
          />
        </section>

        {/* Two Simple Action Forms */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* Form 1: Report Defect */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>➕</span>
                <span>Report Defect</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Click map to select location, enter description, and submit to backend.
              </p>
            </div>

            <form onSubmit={handleAddDefect} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                >
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Pothole in westbound lane..."
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="report-lat"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Latitude
                  </label>
                  <input
                    id="report-lat"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="report-lon"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Longitude
                  </label>
                  <input
                    id="report-lon"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-2xs"
              >
                {saving ? "Saving Defect to Backend..." : "+ Add Defect"}
              </button>
            </form>
          </div>

          {/* Form 2: Search Nearby Defects */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>🔍</span>
                  <span>Find Nearby Defects</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Query backend for defects within radius of selected pin.
                </p>
              </div>
              {nearbyDefects !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setNearbyDefects(null);
                    setMessage("");
                  }}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 shadow-2xs"
                >
                  Show All ({defects.length})
                </button>
              )}
            </div>

            {/* Quick Radius Preset Chips */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Quick Radius Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RADIUS_PRESETS.map((val) => {
                  const isSelected = Number(radius) === val;
                  return (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setRadius(String(val))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
                        isSelected
                          ? "bg-blue-600 text-white font-semibold"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {val >= 1000 ? `${val / 1000} km` : `${val}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleNearbySearch} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="search-lat"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Latitude
                  </label>
                  <input
                    id="search-lat"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="search-lon"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Longitude
                  </label>
                  <input
                    id="search-lon"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="radius-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                >
                  Search Radius (metres)
                </label>
                <input
                  id="radius-input"
                  type="number"
                  min="1"
                  step="any"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-2xs"
              >
                {searching ? "Searching Backend..." : "Search Nearby"}
              </button>
            </form>
          </div>
        </section>

        {/* Defects Table Section */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
          {/* Table Header Bar */}
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span>
                <span>
                  {nearbyDefects !== null
                    ? `Nearby Defects (${filteredDefects.length})`
                    : `Registered Road Defects (${filteredDefects.length})`}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing data fetched directly from backend
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by description or ID..."
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />

              {nearbyDefects !== null && (
                <button
                  type="button"
                  onClick={() => setNearbyDefects(null)}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 shadow-2xs"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Latitude</th>
                  <th className="px-4 py-3">Longitude</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xl animate-spin">🔄</span>
                        <span>Loading defects from backend...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDefects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                      {backendConnected === false ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-xl">⚠️</span>
                          <span>Backend server is offline. No data available.</span>
                          <button
                            type="button"
                            onClick={loadDefects}
                            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 shadow-2xs"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <span>No road defects found.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDefects.map((defect) => {
                    const distance =
                      defect.distance_metres ?? defect.distance ?? defect.distanceMetres;

                    return (
                      <tr key={defect.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                          #{defect.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                          {defect.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">
                          {Number(defect.latitude).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">
                          {Number(defect.longitude).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {distance != null ? (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                              {Number(distance).toFixed(1)} m
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleFocusDefect(defect)}
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 shadow-2xs transition-colors"
                          >
                            View on Map
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
            Showing {filteredDefects.length} of {displayedDefects.length} defect(s)
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 pb-8 text-center text-xs text-gray-400">
          Road Tracker · Backend API: {DEFAULT_API_URL}
        </footer>
      </main>
    </div>
  );
}

export default App;
