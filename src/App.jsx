import { useEffect, useRef, useState } from "react";
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
  const [focusedDefectId, setFocusedDefectId] = useState(null);
  const [copied, setCopied] = useState(false);

  const mapSectionRef = useRef(null);

  // Helper to scroll to the map and fly to specific coordinates
  function redirectToMap(lat, lon, defectId = null) {
    setFocusCoords({ lat, lon, zoom: 16, key: Date.now() });
    if (defectId != null) {
      setFocusedDefectId(defectId);
    }
    // Smoothly redirect viewport to the map section
    setTimeout(() => {
      if (mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
  }

  // Fetch defects directly from backend
  async function loadDefects() {
    setLoading(true);
    setError("");

    try {
      const data = await getDefects(DEFAULT_API_URL);
      setDefects(data);
      setBackendConnected(true);
      return data;
    } catch (err) {
      setBackendConnected(false);
      setDefects([]);
      setError(
        `Unable to reach backend at ${DEFAULT_API_URL}: ${err.message}`
      );
      return [];
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

  // Add new defect to backend and redirect to location on map
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
      const result = await addDefect(DEFAULT_API_URL, {
        description: description.trim(),
        latitude: lat,
        longitude: lon,
      });

      const addedLat = lat;
      const addedLon = lon;

      setMessage("Record added successfully! Redirecting to location on map...");
      setDescription("");
      setNearbyDefects(null);

      // Reload defects list
      const updatedDefects = await loadDefects();

      // Find the created defect if possible to highlight its popup
      const newDefect = updatedDefects?.find(
        (d) =>
          Math.abs(Number(d.latitude) - addedLat) < 0.00001 &&
          Math.abs(Number(d.longitude) - addedLon) < 0.00001
      ) || result;

      // Automatically redirect view to the newly added location on the map
      redirectToMap(addedLat, addedLon, newDefect?.id || null);
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

      // Redirect viewport to map to see results
      redirectToMap(lat, lon, null);
    } catch (err) {
      setError(`Nearby search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  }

  // Focus map on a selected defect and redirect viewport
  function handleFocusDefect(defect) {
    const lat = Number(defect.latitude);
    const lon = Number(defect.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setLatitude(lat.toFixed(6));
      setLongitude(lon.toFixed(6));
      redirectToMap(lat, lon, defect.id);
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
    <div className="min-h-screen bg-black text-zinc-100 antialiased selection:bg-yellow-400 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/95 sticky top-0 z-30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black font-black text-lg shadow-[0_0_15px_rgba(250,204,21,0.4)]">
              ⚠️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-yellow-400 uppercase sm:text-xl">
                  RoadTrack
                </h1>
                <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-yellow-400 border border-yellow-400/30">
                  PRO
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Civil Road Defect & Spatial Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Backend Status Indicator */}
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                backendConnected === true
                  ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                  : backendConnected === false
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  loading
                    ? "bg-yellow-400 animate-pulse"
                    : backendConnected === true
                    ? "bg-yellow-400 shadow-[0_0_8px_#facc15]"
                    : "bg-red-500"
                }`}
              />
              <span>
                {loading
                  ? "Connecting..."
                  : backendConnected === true
                  ? "Live Connected"
                  : "Backend Offline"}
              </span>
            </span>

            {/* Reload button */}
            <button
              type="button"
              onClick={loadDefects}
              disabled={loading}
              title="Reload defects from backend"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-yellow-400 hover:text-yellow-400 transition-colors disabled:opacity-50 shadow-sm"
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs sm:text-sm text-red-300">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-bold text-red-200">{error}</p>
                <p className="text-xs text-red-400 mt-0.5">
                  Ensure the API server is active at{" "}
                  <code className="bg-red-950 border border-red-800 px-1 py-0.5 rounded font-mono text-[11px] text-red-200">
                    {DEFAULT_API_URL}
                  </code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDefects}
                className="rounded-md border border-red-400/50 bg-red-900/60 px-3 py-1 text-xs font-bold text-red-200 hover:bg-red-800 transition-colors shadow-sm"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-200 font-bold px-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {message && (
          <div className="flex items-center justify-between rounded-xl border border-yellow-400/50 bg-yellow-400/10 p-3.5 text-xs sm:text-sm text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.1)]">
            <div className="flex items-center gap-2">
              <span className="text-base text-yellow-400">⚡</span>
              <span className="font-semibold">{message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="text-yellow-400 hover:text-yellow-200 font-bold px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Info Cards */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 border-t-2 border-t-yellow-400 bg-zinc-900/90 p-4 shadow-lg hover:border-zinc-700 transition-all">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total Defects Registered
            </p>
            <p className="mt-1 text-2xl font-black text-yellow-400">
              {defects.length}
            </p>
            <p className="text-[11px] text-zinc-500">
              Fetched from spatial database
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 border-t-2 border-t-yellow-400 bg-zinc-900/90 p-4 shadow-lg hover:border-zinc-700 transition-all">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Current Map View
            </p>
            <p className="mt-1 text-lg font-black text-yellow-400 truncate">
              {nearbyDefects !== null
                ? `Nearby (${nearbyDefects.length} located)`
                : "All Defects"}
            </p>
            <p className="text-[11px] text-zinc-500">
              {nearbyDefects !== null
                ? `Filtered by ${Number(radius) >= 1000 ? `${(Number(radius) / 1000).toFixed(1)} km` : `${radius}m`} radius`
                : "Displaying full registry"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 border-t-2 border-t-yellow-400 bg-zinc-900/90 p-4 shadow-lg hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Selected Coordinates
              </p>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-yellow-400 truncate">
              {latitude}, {longitude}
            </p>
            <p className="text-[11px] text-zinc-500">
              Click map or pick from table to reposition
            </p>
          </div>
        </section>

        {/* Map Section with ref for smooth redirect scrolling */}
        <section id="map-section" ref={mapSectionRef} className="scroll-mt-20">
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
            focusedDefectId={focusedDefectId}
            onSelectDefect={handleFocusDefect}
          />
        </section>

        {/* Two Action Forms: Report Defect & Nearby Search */}
        <section className="grid gap-5 md:grid-cols-2">
          {/* Form 1: Report Defect */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-xl">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-yellow-400">➕</span>
                <span>Report Defect</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Submit coordinates & details. Automatically redirects to map on success.
              </p>
            </div>

            <form onSubmit={handleAddDefect} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-bold uppercase tracking-wider text-yellow-400/90 mb-1"
                >
                  Defect Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Deep asphalt pothole, cracking on northbound lane..."
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="report-lat"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
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
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-yellow-300 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="report-lon"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
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
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-yellow-300 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-yellow-400 py-2.5 text-xs font-black text-black hover:bg-yellow-300 active:scale-[0.99] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(250,204,21,0.25)] cursor-pointer"
              >
                {saving ? "Saving Defect to Database..." : "+ Submit Record & View on Map"}
              </button>
            </form>
          </div>

          {/* Form 2: Search Nearby Defects */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-yellow-400">🔍</span>
                  <span>Spatial Radius Query</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
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
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-bold text-yellow-400 hover:bg-zinc-700 shadow-sm"
                >
                  Show All ({defects.length})
                </button>
              )}
            </div>

            {/* Quick Radius Preset Chips */}
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
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
                      className={`rounded-lg px-2.5 py-1 text-xs transition-all shadow-sm ${
                        isSelected
                          ? "bg-yellow-400 text-black font-extrabold shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                          : "border border-zinc-700 bg-zinc-950 text-zinc-300 font-semibold hover:border-yellow-400 hover:text-yellow-400"
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
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
                  >
                    Center Latitude
                  </label>
                  <input
                    id="search-lat"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-yellow-300 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="search-lon"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
                  >
                    Center Longitude
                  </label>
                  <input
                    id="search-lon"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-yellow-300 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="radius-input"
                  className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1"
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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full rounded-lg border border-yellow-400/60 bg-yellow-400/15 py-2.5 text-xs font-black text-yellow-400 hover:bg-yellow-400 hover:text-black active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {searching ? "Scanning Spatial Defect Index..." : "⚡ Search Nearby & Focus"}
              </button>
            </form>
          </div>
        </section>

        {/* Defects Table Section */}
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-xl">
          {/* Table Header Bar */}
          <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-yellow-400">📋</span>
                <span>
                  {nearbyDefects !== null
                    ? `Nearby Defects (${filteredDefects.length})`
                    : `Registered Road Defects (${filteredDefects.length})`}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click "View on Map" on any defect to redirect and zoom directly to it
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter description or ID..."
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors shadow-sm"
              />

              {nearbyDefects !== null && (
                <button
                  type="button"
                  onClick={() => setNearbyDefects(null)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-zinc-800 shadow-sm"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-black text-[11px] uppercase tracking-wider text-yellow-400 font-bold">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Latitude</th>
                  <th className="px-4 py-3">Longitude</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/80">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl animate-spin text-yellow-400">🔄</span>
                        <span className="font-semibold text-zinc-400">Loading defects from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDefects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-zinc-500">
                      {backendConnected === false ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-2xl text-yellow-400">⚠️</span>
                          <span className="text-zinc-300 font-semibold">Backend server is offline or unreachable.</span>
                          <button
                            type="button"
                            onClick={loadDefects}
                            className="mt-1 rounded-md border border-yellow-400/50 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all shadow-sm"
                          >
                            Retry Connection
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">No road defects recorded yet.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDefects.map((defect) => {
                    const distance =
                      defect.distance_metres ?? defect.distance ?? defect.distanceMetres;
                    const isSelected = focusedDefectId === defect.id;

                    return (
                      <tr
                        key={defect.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-yellow-400/10 border-l-2 border-l-yellow-400"
                            : "hover:bg-zinc-800/50"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-yellow-400">
                          #{defect.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-200 max-w-xs truncate">
                          {defect.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">
                          {Number(defect.latitude).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-400">
                          {Number(defect.longitude).toFixed(6)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {distance != null ? (
                            <span className="font-bold text-yellow-400 bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 rounded text-[11px]">
                              {Number(distance).toFixed(1)} m
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleFocusDefect(defect)}
                            className="inline-flex items-center gap-1 rounded-md border border-yellow-400/50 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black shadow-sm transition-all cursor-pointer"
                          >
                            <span>📍</span>
                            <span>View on Map</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400 flex items-center justify-between">
            <span>
              Showing <span className="text-yellow-400 font-bold">{filteredDefects.length}</span> of {displayedDefects.length} defect(s)
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Yellow &amp; Black Telemetry UI
            </span>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 pb-8 text-center text-xs text-zinc-500">
          RoadTrack Pro · Connected API Endpoint:{" "}
          <span className="text-yellow-400 font-mono">{DEFAULT_API_URL}</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
