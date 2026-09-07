import {
  describeWeather,
  formatTemp,
  formatWind,
  formatChance,
  forecastDayName,
  placeLabel,
  parseRecents,
  rememberRecent,
  forecastUrl,
  searchUrl,
  placeFromGeolocation,
  mapDailyForecast,
  RECENTS_KEY,
  UNIT_KEY,
} from "./weather.js";

const $ = (id) => document.getElementById(id);

const els = {
  form: $("search-form"),
  input: $("city-input"),
  suggestions: $("suggestions"),
  recents: $("recents"),
  locate: $("locate-btn"),
  unitC: $("unit-c"),
  unitF: $("unit-f"),
  status: $("status"),
  current: $("current"),
  forecast: $("forecast"),
  days: $("days"),
  place: $("place"),
  updated: $("updated"),
  icon: $("icon"),
  temp: $("temp"),
  summary: $("summary"),
  feels: $("feels"),
  humidity: $("humidity"),
  wind: $("wind"),
  hiLo: $("hi-lo"),
};

let unit = localStorage.getItem(UNIT_KEY) === "f" ? "f" : "c";
let recents = parseRecents(localStorage.getItem(RECENTS_KEY) || "[]");
let lastPlace = recents[0] || null;
let lastForecast = null;
let searchTimer = 0;

function setStatus(msg) {
  els.status.textContent = msg || "";
}

function setUnit(next) {
  unit = next;
  localStorage.setItem(UNIT_KEY, unit);
  els.unitC.classList.toggle("is-active", unit === "c");
  els.unitF.classList.toggle("is-active", unit === "f");
  els.unitC.setAttribute("aria-pressed", String(unit === "c"));
  els.unitF.setAttribute("aria-pressed", String(unit === "f"));
  if (lastPlace && lastForecast) render(lastPlace, lastForecast);
}

function persistRecents() {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

function renderRecents() {
  if (!recents.length) {
    els.recents.hidden = true;
    els.recents.innerHTML = "";
    return;
  }
  els.recents.hidden = false;
  els.recents.innerHTML = recents
    .map(
      (p, i) =>
        `<li><button type="button" data-recent="${i}">${escapeHtml(placeLabel(p))}</button></li>`
    )
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.suggestions.innerHTML = "";
  els.input.setAttribute("aria-expanded", "false");
}

function showSuggestions(places) {
  if (!places.length) {
    hideSuggestions();
    return;
  }
  els.suggestions.hidden = false;
  els.input.setAttribute("aria-expanded", "true");
  els.suggestions.innerHTML = places
    .map(
      (p, i) =>
        `<li role="option"><button type="button" data-suggest="${i}">${escapeHtml(placeLabel(p))}</button></li>`
    )
    .join("");
  els.suggestions._places = places;
}

async function searchPlaces(query) {
  const q = query.trim();
  if (q.length < 2) {
    hideSuggestions();
    return [];
  }
  const res = await fetch(searchUrl(q));
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return data.results || [];
}

async function loadForecast(place) {
  setStatus(`Loading ${placeLabel(place)}…`);
  const res = await fetch(forecastUrl(place));
  if (!res.ok) throw new Error("Forecast request failed");
  const data = await res.json();
  lastPlace = place;
  lastForecast = data;
  recents = rememberRecent(recents, place);
  persistRecents();
  renderRecents();
  render(place, data);
  setStatus("");
}

function render(place, data) {
  const current = data.current || {};
  const wx = describeWeather(current.weather_code);
  const days = mapDailyForecast(data.daily);
  const today = days[0];

  els.current.hidden = false;
  els.forecast.hidden = false;
  els.place.textContent = placeLabel(place);
  els.updated.textContent = current.time
    ? `Updated ${new Date(current.time).toLocaleString()}`
    : "";
  els.icon.textContent = wx.icon;
  els.temp.textContent = formatTemp(current.temperature_2m, unit);
  els.summary.textContent = wx.label;
  els.feels.textContent = formatTemp(current.apparent_temperature, unit);
  els.humidity.textContent =
    current.relative_humidity_2m == null
      ? "—"
      : `${Math.round(current.relative_humidity_2m)}%`;
  els.wind.textContent = formatWind(
    current.wind_speed_10m,
    current.wind_direction_10m,
    unit
  );
  els.hiLo.textContent = today
    ? `${formatTemp(today.tMax, unit)} / ${formatTemp(today.tMin, unit)}`
    : "—";

  els.days.innerHTML = days
    .map((day) => {
      const d = describeWeather(day.weatherCode);
      return `<li class="day">
        <span class="day-name">${forecastDayName(day.date)}</span>
        <span class="day-icon" aria-hidden="true">${d.icon}</span>
        <span class="day-label">${escapeHtml(d.label)}</span>
        <span class="day-temps">${formatTemp(day.tMax, unit)} / ${formatTemp(day.tMin, unit)}</span>
        <span class="day-precip">${formatChance(day.precipChance)} rain</span>
      </li>`;
    })
    .join("");
}

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideSuggestions();
  try {
    const places = await searchPlaces(els.input.value);
    if (!places.length) {
      setStatus("No matching places. Try another city name.");
      return;
    }
    await loadForecast(places[0]);
  } catch (err) {
    setStatus(err.message || "Could not load weather.");
  }
});

els.input.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const places = await searchPlaces(els.input.value);
      showSuggestions(places);
    } catch {
      hideSuggestions();
    }
  }, 220);
});

els.suggestions.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-suggest]");
  if (!btn) return;
  const places = els.suggestions._places || [];
  const place = places[Number(btn.dataset.suggest)];
  if (!place) return;
  els.input.value = placeLabel(place);
  hideSuggestions();
  try {
    await loadForecast(place);
  } catch (err) {
    setStatus(err.message || "Could not load weather.");
  }
});

els.recents.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-recent]");
  if (!btn) return;
  const place = recents[Number(btn.dataset.recent)];
  if (!place) return;
  els.input.value = placeLabel(place);
  try {
    await loadForecast(place);
  } catch (err) {
    setStatus(err.message || "Could not load weather.");
  }
});

els.locate.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.");
    return;
  }
  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        await loadForecast(placeFromGeolocation(pos.coords));
      } catch (err) {
        setStatus(err.message || "Could not load weather.");
      }
    },
    () => setStatus("Location permission denied. Search for a city instead."),
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

els.unitC.addEventListener("click", () => setUnit("c"));
els.unitF.addEventListener("click", () => setUnit("f"));

document.addEventListener("click", (e) => {
  if (!els.form.contains(e.target)) hideSuggestions();
});

setUnit(unit);
renderRecents();
if (lastPlace) {
  loadForecast(lastPlace).catch(() => setStatus("Search a city to get started."));
} else {
  setStatus("Search a city or use Near me to see the forecast.");
}
