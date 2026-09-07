import test from "node:test";
import assert from "node:assert/strict";
import {
  describeWeather,
  cToF,
  formatTemp,
  placeLabel,
  kmhToMph,
  formatWindDir,
  formatWind,
  formatChance,
  forecastDayName,
  placeKey,
  parseRecents,
  rememberRecent,
  forecastUrl,
  searchUrl,
  placeFromGeolocation,
  mapDailyForecast,
  MAX_RECENTS,
} from "../weather.js";

test("describeWeather maps WMO codes and unknown codes", () => {
  assert.equal(describeWeather(0).label, "Clear sky");
  assert.equal(describeWeather(95).icon, "⛈️");
  assert.equal(describeWeather(1234).label, "Unknown conditions");
});

test("temperature conversion and formatting", () => {
  assert.equal(cToF(0), 32);
  assert.equal(cToF(100), 212);
  assert.equal(formatTemp(21.4, "c"), "21°C");
  assert.equal(formatTemp(20, "f"), "68°F");
  assert.equal(formatTemp(null, "c"), "—");
});

test("placeLabel joins available parts", () => {
  assert.equal(
    placeLabel({ name: "Innsbruck", admin1: "Tyrol", country: "Austria" }),
    "Innsbruck, Tyrol, Austria"
  );
  assert.equal(placeLabel({ name: "Oslo", country: "Norway" }), "Oslo, Norway");
  assert.equal(placeLabel(null), "");
});

test("wind helpers", () => {
  assert.ok(Math.abs(kmhToMph(16.0934) - 10) < 0.01);
  assert.equal(formatWindDir(0), "N");
  assert.equal(formatWindDir(90), "E");
  assert.equal(formatWindDir(180), "S");
  assert.equal(formatWind(16, 90, "c"), "16 km/h E");
  assert.equal(formatWind(16.0934, 0, "f"), "10 mph N");
  assert.equal(formatWind(null, 0, "c"), "—");
});

test("chance formatting", () => {
  assert.equal(formatChance(42.2), "42%");
  assert.equal(formatChance(null), "—");
});

test("forecastDayName labels today and tomorrow", () => {
  const now = new Date(2026, 8, 6);
  assert.equal(forecastDayName("2026-09-06", now), "Today");
  assert.equal(forecastDayName("2026-09-07", now), "Tomorrow");
  assert.match(forecastDayName("2026-09-08", now), /[A-Za-z]{3}/);
});

test("recents remember unique places and cap length", () => {
  const a = { name: "A", latitude: 1, longitude: 2 };
  const b = { name: "B", latitude: 3, longitude: 4 };
  const c = { name: "C", latitude: 5, longitude: 6 };
  const d = { name: "D", latitude: 7, longitude: 8 };
  const e = { name: "E", latitude: 9, longitude: 10 };
  const f = { name: "F", latitude: 11, longitude: 12 };
  let recents = [];
  recents = rememberRecent(recents, a);
  recents = rememberRecent(recents, b);
  recents = rememberRecent(recents, a);
  assert.equal(recents[0].name, "A");
  assert.equal(recents.length, 2);
  recents = rememberRecent(recents, c);
  recents = rememberRecent(recents, d);
  recents = rememberRecent(recents, e);
  recents = rememberRecent(recents, f);
  assert.equal(recents.length, MAX_RECENTS);
  assert.equal(recents[0].name, "F");
  assert.equal(placeKey(a), "1,2");
});

test("parseRecents handles junk", () => {
  assert.deepEqual(parseRecents("not-json"), []);
  assert.deepEqual(parseRecents("{}"), []);
  assert.equal(parseRecents('[{"name":"Oslo","latitude":59.9,"longitude":10.7}]')[0].name, "Oslo");
});

test("API URL builders", () => {
  const url = forecastUrl({ latitude: 47.27, longitude: 11.39 });
  assert.match(url, /latitude=47.27/);
  assert.match(url, /longitude=11.39/);
  assert.match(url, /current=/);
  assert.match(url, /daily=/);
  const s = searchUrl("Innsbruck");
  assert.match(s, /name=Innsbruck/);
});

test("placeFromGeolocation", () => {
  const place = placeFromGeolocation({ latitude: 40.7, longitude: -74 });
  assert.equal(place.name, "My location");
  assert.equal(place.latitude, 40.7);
});

test("mapDailyForecast zips Open-Meteo daily arrays", () => {
  const days = mapDailyForecast({
    time: ["2026-09-06", "2026-09-07"],
    weather_code: [0, 61],
    temperature_2m_max: [22, 18],
    temperature_2m_min: [11, 9],
    precipitation_probability_max: [5, 80],
  });
  assert.equal(days.length, 2);
  assert.equal(days[1].weatherCode, 61);
  assert.equal(days[1].tMax, 18);
  assert.deepEqual(mapDailyForecast(null), []);
});
