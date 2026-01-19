# Data Models & Schemas

This document defines the core data structures used in the Avalanche Archiver.

## 1. Weather Stations (`data/weather_stations.json`)
A list of mountain weather stations and their timeseries data.

```typescript
type WeatherStationDB = WeatherStation[];

interface WeatherStation {
  name: string;        // e.g. "Hochgrat (1715m) / Hörmoos (1300m)"
  id: string;          // Unique ID, e.g. "7"
  apiUrl: string;      // The JSON source URL
  originalUrl: string; // The public facing URL
  lat: number;         // Latitude
  lon: number;         // Longitude
  elevation: number;   // Meters above sea level
  lastUpdated: string; // ISO Date String
  data: WeatherMeasurement[];
}

interface WeatherMeasurement {
  _id: string;
  ID: string;          // Station ID
  TS: string;          // Timestamp "YYYY-MM-DD HH:mm:ss"
  HS?: number;         // Height of Snow (cm)
  TL?: number;         // Temperature Air (°C)
  TO?: number;         // Temperature Surface? (°C)
  dd?: number;         // Wind Direction (degrees)
  ff?: number;         // Wind Speed (m/s) or km/h?
  ffBoe?: number;      // Wind Gusts
  // ... other sensor fields
}
```

## 2. Weather Reports (`data/weather_archive.json`)
Daily textual weather reports scraped from the Avalanche Warning Service.

```typescript
type WeatherReportDB = WeatherReport[];

interface WeatherReport {
  date: string;              // "YYYY-MM-DD"
  title: string;             // e.g. "Mountain Weather Report (2026-01-19)"
  issued: string;            // Text description of issue time
  html_content: string;      // Raw HTML from source (German)
  translated_content?: string; // English translation (HTML)
  fetched_at?: string;       // ISO timestamp
}
```

## 3. Incidents (`data/incidents.json`)
Avalanche accidents scraped from lawis.at.

```typescript
type IncidentDB = Incident[];

interface Incident {
  id: number;                // Lawis ID
  date: string;              // "YYYY-MM-DD HH:mm:ss"
  location: string;          // Description
  regionId: number;
  subregionId: number;
  lat: number;
  lon: number;
  url: string;               // Lawis detail URL
  details: IncidentDetails;
  linked_profiles: LinkedProfile[];
  pdf_path?: string;         // Path to archived PDF bulletin for that day
}

interface IncidentDetails {
  comments?: string;         // Description German
  comments_en?: string;      // Description English
  danger?: {
    rating?: {
      level: number;         // 1-5
      text: string;
    };
    problem?: {
      text: string;          // e.g. "fresh snow"
    };
  };
  avalanche?: {
    type: { text: string }; // e.g. "slab"
    size: { text: string }; // e.g. "2: medium avalanche"
    release: { text: string }; // e.g. "artificial"
  };
  involved?: {
    dead: number;
    injured: number;
    buried_total: number;
    // ...
  };
  images: Array<{ url: string }>;
}
```

## 4. Region Config (`tools/lib/config.js`)
Configuration for the daily bulletin fetchers.

```typescript
interface RegionConfig {
  [slug: string]: {
    label: string;    // Human readable name
    slug: string;     // URL friendly ID
    type: 'pdf';      // Only PDF supported currently
  }
}

interface RegionPdfMap {
  [api_id: string]: string; // Maps Source ID (e.g. DE-BY-12) to Slug (allgau-alps-central)
}
```
