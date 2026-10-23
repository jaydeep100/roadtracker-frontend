const RAW_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://roadtracker-backend.onrender.com";

const cleanUrl = RAW_BASE_URL.trim().replace(/\/+$/, "");

// Ensure apiUrl points to the defects resource endpoint (/api/defects)
export const DEFAULT_API_URL = cleanUrl.endsWith("/api/defects")
  ? cleanUrl
  : cleanUrl.endsWith("/api")
  ? `${cleanUrl}/defects`
  : `${cleanUrl}/api/defects`;

/**
 * Fetch all defects directly from backend API.
 * No dummy data or local store fallback.
 */
export async function getDefects(apiUrl = DEFAULT_API_URL) {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }
  const text = await response.text();
  if (!text || !text.trim()) {
    return [];
  }
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Add a new defect to the backend API.
 * Payload: { description, latitude, longitude }
 */
export async function addDefect(apiUrl = DEFAULT_API_URL, { description, latitude, longitude }) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: description.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Server error (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) errorMessage = parsed.message;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/**
 * Query nearby defects within a radius from the backend.
 * Calls: GET /api/defects/nearby?lat={lat}&lon={lon}&radius={radius}
 */
export async function searchNearby(apiUrl = DEFAULT_API_URL, { lat, lon, radius }) {
  const params = new URLSearchParams({
    lat: String(Number(lat)),
    lon: String(Number(lon)),
    radius: String(Number(radius)),
  });

  const response = await fetch(`${apiUrl}/nearby?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return [];
  }
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data ? [data] : [];
  } catch {
    return [];
  }
}
