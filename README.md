# Anabatic Weather

A small browser weather desk: search any city or use your location, see current conditions, and scan a 7-day forecast.

Powered by the public [Open-Meteo](https://open-meteo.com/) forecast and geocoding APIs. No API key.

## Features

- Current conditions (temperature, feels like, humidity, wind, weather code)
- City search with suggestions
- Browser geolocation (“Near me”)
- 7-day forecast (high / low, precip chance)
- °C / °F toggle
- Recent places

## Run

```bash
npm test
python3 -m http.server 8765
```

Then open http://localhost:8765
