export const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const RECENTS_KEY = "anabatic-weather:recents";
export const UNIT_KEY = "anabatic-weather:unit";
export const MAX_RECENTS = 5;

const WMO = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Dense freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "🌨️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "🌧️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

export function describeWeather(code) {
  return WMO[code] ?? { label: "Unknown conditions", icon: "🌡️" };
}

export function cToF(c) {
  return (c * 9) / 5 + 32;
}

export function formatTemp(celsius, unit) {
  if (celsius == null || Number.isNaN(Number(celsius))) return "—";
  const value = unit === "f" ? cToF(celsius) : Number(celsius);
  return `${Math.round(value)}°${unit === "f" ? "F" : "C"}`;
}

export function placeLabel(place) {
  if (!place) return "";
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

export function kmhToMph(kmh) {
  return Number(kmh) * 0.621371;
}

export function formatWindDir(degrees) {
  if (degrees == null || Number.isNaN(Number(degrees))) return "";
  const dirs = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const heading = ((Number(degrees) % 360) + 360) % 360;
  return dirs[Math.round(heading / 22.5) % 16];
}

export function formatWind(kmh, degrees, unit) {
  if (kmh == null || Number.isNaN(Number(kmh))) return "—";
  const speed = unit === "f" ? kmhToMph(kmh) : Number(kmh);
  const suffix = unit === "f" ? "mph" : "km/h";
  const dir = formatWindDir(degrees);
  const rounded = Math.round(speed);
  return dir ? `${rounded} ${suffix} ${dir}` : `${rounded} ${suffix}`;
}

export function formatChance(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return "—";
  return `${Math.round(Number(pct))}%`;
}

export function forecastDayName(isoDate, now = new Date()) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function placeKey(place) {
  if (!place) return "";
  return `${place.latitude},${place.longitude}`;
}

export function parseRecents(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.name === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function rememberRecent(recents, place) {
  const key = placeKey(place);
  const next = [place, ...recents.filter((p) => placeKey(p) !== key)];
  return next.slice(0, MAX_RECENTS);
}

export function forecastUrl(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });
  return `${FORECAST_URL}?${params}`;
}

export function searchUrl(name) {
  const params = new URLSearchParams({
    name,
    count: "6",
    language: "en",
    format: "json",
  });
  return `${GEO_URL}?${params}`;
}

export function placeFromGeolocation(coords, label = "My location") {
  return {
    name: label,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export function mapDailyForecast(daily) {
  if (!daily || !Array.isArray(daily.time)) return [];
  return daily.time.map((time, i) => ({
    date: time,
    weatherCode: daily.weather_code?.[i],
    tMax: daily.temperature_2m_max?.[i],
    tMin: daily.temperature_2m_min?.[i],
    precipChance: daily.precipitation_probability_max?.[i],
  }));
}
