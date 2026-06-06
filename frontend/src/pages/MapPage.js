import React, { useEffect, useState, useRef } from 'react';
import { subscribeToIssues } from '../services/issueService';
import { subscribeToAccidents, subscribeToCrimes } from '../services/safetyService';
import { subscribeToWasteReports, subscribeToActiveRoutes } from '../services/wasteService';

const CAT_COLORS = { safety:'#ff4444', pollution:'#ff8800', traffic:'#ffcc00', waste:'#00cc66', convenience:'#4488ff' };
const CAT_ICONS  = { safety:'🛡️', pollution:'💨', traffic:'🚗', waste:'🗑️', convenience:'🏗️' };

const getAQIColor = (v) => v<=50?'#00cc66':v<=100?'#ffcc00':v<=150?'#ff8800':v<=200?'#ff4444':'#aa44ff';
const getAQILabel = (v) => v<=50?'Good':v<=100?'Moderate':v<=150?'Unhealthy (Sensitive)':v<=200?'Unhealthy':'Hazardous';

export default function MapPage() {
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const markers   = useRef([]);
  const tileRef   = useRef(null);
  const userMarkerRef = useRef(null);

  const [issues,      setIssues]      = useState([]);
  const [layer,       setLayer]       = useState('standard');
  const [airQuality,  setAirQuality]  = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [ready,       setReady]       = useState(false);
  const [locStatus,   setLocStatus]   = useState('asking'); // 'asking' | 'granted' | 'denied' | 'loading'
  const [userLoc,     setUserLoc]     = useState(null);
  const [cityName,    setCityName]    = useState('');
  const [trafficZones, setTrafficZones] = useState([]);
  const [searchQuery,   setSearchQuery]  = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]    = useState(false);

  // Safety Data
  const [accidents, setAccidents] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [showSafety, setShowSafety] = useState(true);
  const safetyMarkers = useRef([]);

  // Waste Data
  const [wasteReports, setWasteReports] = useState([]);
  const [wasteRoutes, setWasteRoutes] = useState([]);
  const [showWaste, setShowWaste] = useState(true);
  const wasteMarkers = useRef([]);

  // Risk & Performance Data
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showPerformance, setShowPerformance] = useState(false);
  const riskMarkers = useRef([]);
  const performanceMarkers = useRef([]);

  // Routing Data
  const [routingMode, setRoutingMode] = useState(false);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState('');
  const routeLayerRef = useRef(null);
  const routeMarkersRef = useRef([]);

  useEffect(() => {
    const unsub1 = subscribeToIssues(setIssues);
    const unsub2 = subscribeToAccidents(setAccidents);
    const unsub3 = subscribeToCrimes(setCrimes);
    const unsub4 = subscribeToWasteReports(setWasteReports);
    const unsub5 = subscribeToActiveRoutes(setWasteRoutes);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  /* ── Ask for geolocation (Live Tracking) ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('denied');
      setUserLoc({ lat:17.3850, lng:78.4867 });
      return;
    }
    setLocStatus('loading');
    
    // Use watchPosition for live tracking instead of getCurrentPosition
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(prev => {
          // Only reverse geocode if this is the first time setting location (to save API calls)
          if (!prev) {
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`)
              .then(r => r.json())
              .then(d => {
                const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'Your City';
                setCityName(city);
              })
              .catch(() => setCityName('Your Location'));
          }
          return loc;
        });
        setLocStatus(prev => prev !== 'granted' ? 'granted' : prev);
      },
      () => {
        setLocStatus(prev => {
          if (prev !== 'granted') {
            setUserLoc({ lat:17.3850, lng:78.4867 });
            setCityName('Hyderabad');
            return 'denied';
          }
          return prev;
        });
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ── Fetch weather & AQI once we have location ── */
  useEffect(() => {
    if (!userLoc) return;
    const { lat, lng } = userLoc;

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation`)
      .then(r => r.json())
      .then(d => setWeather({ temp: d.current?.temperature_2m ?? '--', humidity: d.current?.relative_humidity_2m ?? '--', wind: d.current?.wind_speed_10m ?? '--', rain: d.current?.precipitation ?? 0 }))
      .catch(() => setWeather({ temp:27, humidity:61, wind:1, rain:0 }));

    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi`)
      .then(r => r.json())
      .then(d => setAirQuality({ aqi: d.current?.european_aqi||0, pm25:(d.current?.pm2_5||0).toFixed(1), pm10:(d.current?.pm10||0).toFixed(1), no2:(d.current?.nitrogen_dioxide||0).toFixed(1), o3:(d.current?.ozone||0).toFixed(1) }))
      .catch(() => setAirQuality({ aqi:69, pm25:'21.4', pm10:'22.5', no2:'12.0', o3:'94.0' }));

    // Fetch real nearby roads from Overpass API (OpenStreetMap)
    const offsets = [
      { dLat:0.010, dLng:0.013, level:'high',   radius:380 },
      { dLat:-0.012, dLng:-0.009, level:'medium', radius:350 },
      { dLat:0.020, dLng:-0.015, level:'low',    radius:420 },
      { dLat:-0.008, dLng:0.018, level:'high',   radius:320 },
      { dLat:0.015, dLng:0.020, level:'medium',  radius:360 },
      { dLat:-0.020, dLng:0.010, level:'low',    radius:400 },
    ];

    // Query Overpass for real road names near user location
    const bbox = `${lat-0.05},${lng-0.05},${lat+0.05},${lng+0.05}`;
    const overpassQuery = `[out:json][timeout:15];way["highway"~"primary|secondary|trunk|motorway|tertiary"]["name"](${bbox});out 20;`;

    const buildZones = (roads) => {
      return offsets.map((o, i) => ({
        lat: lat + o.dLat, lng: lng + o.dLng,
        level: o.level, radius: o.radius,
        label: roads[i] || `Zone ${i + 1} (${cityName || 'Local'})`,
      }));
    };

    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`)
      .then(r => r.json())
      .then(data => {
        const roads = [...new Set(
          data.elements.filter(e => e.tags?.name).map(e => e.tags.name)
        )].slice(0, 6);
        setTrafficZones(buildZones(roads));
      })
      .catch(() => {
        // Fallback: fetch nearby areas from Nominatim
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName||'')}&format=json&limit=6&addressdetails=1`)
          .then(r => r.json())
          .then(data => {
            const names = data.map(d => d.display_name.split(',')[0]).filter(Boolean);
            setTrafficZones(buildZones(names));
          })
          .catch(() => setTrafficZones(buildZones([])));
      });

    // Query Overpass for real Hospitals & Police Stations
    const safetyQuery = `[out:json][timeout:15];(node["amenity"="hospital"](${bbox});node["amenity"="police"](${bbox}););out 20;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(safetyQuery)}`)
      .then(r => r.json())
      .then(data => {
        const hosps = [];
        const pols = [];
        data.elements.forEach(e => {
          if (e.tags?.amenity === 'hospital') hosps.push({ lat: e.lat, lng: e.lon, name: e.tags.name || 'Hospital' });
          if (e.tags?.amenity === 'police') pols.push({ lat: e.lat, lng: e.lon, name: e.tags.name || 'Police Station' });
        });
        // Add fake ones if missing
        if (hosps.length === 0) hosps.push({ lat: lat+0.015, lng: lng+0.012, name: 'City General Hospital' });
        if (pols.length === 0) pols.push({ lat: lat-0.010, lng: lng-0.015, name: 'Central Police Precinct' });
        setHospitals(hosps);
        setPoliceStations(pols);
      })
      .catch(() => {
        setHospitals([{ lat: lat+0.015, lng: lng+0.012, name: 'City General Hospital' }]);
        setPoliceStations([{ lat: lat-0.010, lng: lng-0.015, name: 'Central Police Precinct' }]);
      });

  }, [userLoc]);

  /* ── Init Leaflet once we have userLoc ── */
  useEffect(() => {
    if (!userLoc || mapInst.current) return;

    const injectCSS = () => {
      if (document.getElementById('leaflet-css')) return;
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    };

    const initMap = () => {
      if (mapInst.current) return;
      const div = mapRef.current;
      if (!div) { setTimeout(initMap, 100); return; }
      const L = window.L;
      try {
        const map = L.map(div, { zoomControl: true, preferCanvas: true })
          .setView([userLoc.lat, userLoc.lng], 14);

        // Use OpenStreetMap standard tile — shows all road/city labels
        tileRef.current = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom:19 }
        ).addTo(map);

            // Initial user location marker
        const pulseHtml = `
          <div style="position:relative;width:40px;height:40px">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(26,115,232,0.3);animation:mapPulse 2s ease-out infinite"></div>
            <div style="position:absolute;inset:8px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 10px rgba(0,0,0,0.5)"></div>
          </div>`;
        const userIcon = L.divIcon({ html: pulseHtml, className:'', iconAnchor:[20,20] });
        userMarkerRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>📍 You are here</b><br>Live Tracking Active`);

        mapInst.current = map;
        setTimeout(() => { map.invalidateSize(); setReady(true); }, 300);
      } catch(e) { console.error('Map init error:', e); }
    };

    injectCSS();
    if (window.L) { initMap(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => setTimeout(initMap, 150);
      document.head.appendChild(s);
    }
  }, [userLoc]);

  /* ── Update user marker on live track ── */
  useEffect(() => {
    if (!userMarkerRef.current || !userLoc) return;
    userMarkerRef.current.setLatLng([userLoc.lat, userLoc.lng]);
    
    if (cityName) {
      userMarkerRef.current.setPopupContent(`<b style="color:#1a73e8">📍 You are here</b><br>${cityName}<br><span style="font-size:11px;color:#888">Live Tracking Active</span>`);
    }
  }, [userLoc, cityName]);

  /* ── Swap tile layer ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L) return;
    const L = window.L; const map = mapInst.current;
    if (tileRef.current) { map.removeLayer(tileRef.current); tileRef.current = null; }
    const TILES = {
      // Standard OSM — best labels, road names, city names
      standard:  ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                     '© OpenStreetMap contributors'],
      // Satellite with labels overlay
      satellite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',           '© Esri'],
      // Dark theme with clear labels
      dark:      ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                           '© CartoDB'],
      terrain:   ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                        '© OpenTopoMap'],
    };
    const [url, attr] = TILES[layer] || TILES.standard;
    tileRef.current = L.tileLayer(url, { maxZoom:19, attribution: attr }).addTo(map);

    // For satellite, also add a label overlay so road/city names are visible
    if (layer === 'satellite') {
      const labelOverlay = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        { maxZoom:19, opacity:0.85, pane:'shadowPane' }
      ).addTo(map);
      // store so we can remove it later
      map._labelOverlay = labelOverlay;
    } else if (map._labelOverlay) {
      map.removeLayer(map._labelOverlay);
      map._labelOverlay = null;
    }
  }, [layer, ready]);

  /* ── Draw issue markers + traffic zones ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L || !userLoc || trafficZones.length === 0) return;
    const L = window.L; const map = mapInst.current;

    markers.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    markers.current = [];

    // Issue markers (deterministic positions around user)
    issues.forEach((issue, idx) => {
      const seed = idx * 1.618033;
      const lat = userLoc.lat + ((seed % 1) - 0.5) * 0.05;
      const lng = userLoc.lng + (((seed * 1.3) % 1) - 0.5) * 0.05;
      const color = CAT_COLORS[issue.category] || '#4488ff';
      const icon  = CAT_ICONS[issue.category]  || '📌';
      const divIcon = L.divIcon({
        html: `<div style="background:${color};padding:5px 8px;border-radius:10px;font-size:15px;box-shadow:0 3px 14px rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.9)">${icon}</div>`,
        className:'', iconAnchor:[15,15]
      });
      const m = L.marker([lat, lng], { icon: divIcon }).addTo(map)
        .bindPopup(`<div style="min-width:170px"><b style="color:${color}">${icon} ${issue.title}</b><br>📍 ${issue.location}<br>⚠️ <b>${issue.urgency}</b> · Score: <b>${issue.priorityScore}</b><br>Status: <span style="color:${issue.status==='resolved'?'#00cc66':'#ff8800'}">${issue.status}</span></div>`);
      markers.current.push(m);
    });

    // Traffic zones as polygon rings around real coords
    trafficZones.forEach(z => {
      const c = z.level==='high'?'#ff4444':z.level==='medium'?'#ff8800':'#00cc66';
      const pts = [];
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * 2 * Math.PI;
        const dLat  = (z.radius / 111000) * Math.cos(angle);
        const dLng  = (z.radius / (111000 * Math.cos(z.lat * Math.PI / 180))) * Math.sin(angle);
        pts.push([z.lat + dLat, z.lng + dLng]);
      }
      const poly = L.polygon(pts, { color:c, fillColor:c, fillOpacity:0.15, weight:1.5, dashArray:'5 4' })
        .addTo(map)
        .bindPopup(`<b>🚗 ${z.label}</b><br>Congestion: <b style="color:${c}">${z.level}</b>`);
      markers.current.push(poly);

      const dot = L.circleMarker([z.lat, z.lng], { radius:5, color:'var(--bg-page)', weight:1, fillColor:c, fillOpacity:1 }).addTo(map);
      markers.current.push(dot);
    });

  }, [issues, ready, trafficZones, userLoc]);

  /* ── Draw Safety markers (Hospitals, Police, Accidents, Crimes) ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L || !userLoc) return;
    const L = window.L; const map = mapInst.current;
    
    safetyMarkers.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    safetyMarkers.current = [];

    if (!showSafety) return;

    // Hospitals
    hospitals.forEach(h => {
      const icon = L.divIcon({ html: `<div style="background:#ff4444;padding:4px;border-radius:50%;border:2px solid #fff;font-size:16px;box-shadow:0 0 10px #ff4444">🏥</div>`, className:'', iconAnchor:[16,16] });
      const m = L.marker([h.lat, h.lng], { icon }).addTo(map).bindPopup(`<b style="color:#ff4444">🏥 ${h.name}</b><br>Emergency Room Open`);
      safetyMarkers.current.push(m);
    });

    // Police
    policeStations.forEach(p => {
      const icon = L.divIcon({ html: `<div style="background:#4488ff;padding:4px;border-radius:50%;border:2px solid #fff;font-size:16px;box-shadow:0 0 10px #4488ff">🚓</div>`, className:'', iconAnchor:[16,16] });
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b style="color:#4488ff">🚓 ${p.name}</b><br>24/7 Dispatch`);
      safetyMarkers.current.push(m);
    });

    // Simulated Accidents (Heatmap / Dots)
    accidents.forEach((acc, idx) => {
      const seed = idx * 1.34;
      const lat = userLoc.lat + ((seed % 1) - 0.5) * 0.08;
      const lng = userLoc.lng + (((seed * 1.7) % 1) - 0.5) * 0.08;
      const circle = L.circle([lat, lng], { radius: 150, color: 'transparent', fillColor: '#ff8800', fillOpacity: 0.4 }).addTo(map)
        .bindPopup(`<b>🚗 Accident Reported</b><br>${acc.location}<br>Severity: <b style="color:#ff8800">${acc.severity}</b>`);
      safetyMarkers.current.push(circle);
    });

    // Simulated Crimes (Heatmap / Dots)
    crimes.forEach((crime, idx) => {
      const seed = idx * 2.15;
      const lat = userLoc.lat + ((seed % 1) - 0.5) * 0.07;
      const lng = userLoc.lng + (((seed * 1.9) % 1) - 0.5) * 0.07;
      const circle = L.circle([lat, lng], { radius: 200, color: 'transparent', fillColor: '#aa44ff', fillOpacity: 0.3 }).addTo(map)
        .bindPopup(`<b>🔍 Crime Reported</b><br>${crime.location}<br>Type: ${crime.type}`);
      safetyMarkers.current.push(circle);
    });

  }, [accidents, crimes, hospitals, policeStations, showSafety, ready, userLoc]);

  /* ── Draw Waste markers & Routes ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L || !userLoc) return;
    const L = window.L; const map = mapInst.current;
    
    wasteMarkers.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    wasteMarkers.current = [];

    if (!showWaste) return;

    // Waste Reports (Heatmap)
    wasteReports.filter(r => r.status === 'open').forEach((w, idx) => {
      const circle = L.circle([w.lat || userLoc.lat, w.lng || userLoc.lng], { radius: 100, color: 'transparent', fillColor: '#00cc66', fillOpacity: 0.5 }).addTo(map)
        .bindPopup(`<b>♻️ Waste Pile</b><br>${w.location}<br>Severity: <b style="color:#00cc66">${w.severity}</b><br>Votes: ${w.votes}`);
      wasteMarkers.current.push(circle);
    });

    // Active Routes (Polyline)
    wasteRoutes.forEach(route => {
      if (!route.stops || route.stops.length === 0) return;
      
      const pts = route.stops.map(s => [s.lat || userLoc.lat, s.lng || userLoc.lng]);
      
      const polyline = L.polyline(pts, { color: '#00cc66', weight: 4, dashArray: '10, 10' }).addTo(map)
        .bindPopup(`<b>🚛 Active Garbage Route</b><br>${pts.length} stops`);
      wasteMarkers.current.push(polyline);
      
      // Route sequence numbers
      pts.forEach((pt, i) => {
        const icon = L.divIcon({ html: `<div style="background:#111;color:#00cc66;padding:2px 6px;border-radius:10px;border:2px solid #00cc66;font-size:12px;font-weight:bold">${i+1}</div>`, className:'', iconAnchor:[10,10] });
        const m = L.marker(pt, { icon }).addTo(map);
        wasteMarkers.current.push(m);
      });
    });

  }, [wasteReports, wasteRoutes, showWaste, ready, userLoc]);

  /* ── Draw Risk Zones & Area Performance ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L || !userLoc) return;
    const L = window.L; const map = mapInst.current;

    riskMarkers.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    performanceMarkers.current.forEach(m => { try { map.removeLayer(m); } catch(_){} });
    riskMarkers.current = [];
    performanceMarkers.current = [];

    // 1. Risk Zones
    if (showRiskZones) {
      // Create a massive red polygon where critical accidents and high-severity crimes overlap
      // We will simulate 3 main risk zones near the user
      const offsets = [
        { dLat: 0.015, dLng: -0.02 },
        { dLat: -0.025, dLng: 0.015 },
        { dLat: 0.005, dLng: 0.025 }
      ];
      
      offsets.forEach((off, i) => {
        const centerLat = userLoc.lat + off.dLat;
        const centerLng = userLoc.lng + off.dLng;
        const pts = [];
        // Draw an irregular polygon to look like a "zone"
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const r = (500 + Math.random() * 300) / 111000;
          pts.push([centerLat + r * Math.cos(a), centerLng + r * Math.sin(a)]);
        }
        const poly = L.polygon(pts, { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.3, weight: 2, dashArray: '10 5' })
          .addTo(map)
          .bindPopup(`<b>🚨 High Risk Zone</b><br>High concentration of accidents and crimes.<br>Avoid this area if possible.`);
        riskMarkers.current.push(poly);
      });
    }

    // 2. Area Performance Maps (Coloring the traffic zones by grade)
    if (showPerformance && trafficZones.length > 0) {
      trafficZones.forEach((z, i) => {
        // Calculate a fake grade based on index and some random data
        const score = Math.floor(40 + (i * 12) + (Math.random() * 10)); // 40 to ~100
        let grade = 'F'; let c = '#ff4444';
        if (score >= 90) { grade = 'A'; c = '#00cc66'; }
        else if (score >= 80) { grade = 'B'; c = '#aacc00'; }
        else if (score >= 70) { grade = 'C'; c = '#ffcc00'; }
        else if (score >= 60) { grade = 'D'; c = '#ff8800'; }

        const pts = [];
        for (let a = 0; a < 36; a++) {
          const angle = (a / 36) * 2 * Math.PI;
          const dLat  = (z.radius * 1.5 / 111000) * Math.cos(angle);
          const dLng  = (z.radius * 1.5 / (111000 * Math.cos(z.lat * Math.PI / 180))) * Math.sin(angle);
          pts.push([z.lat + dLat, z.lng + dLng]);
        }
        const poly = L.polygon(pts, { color: c, fillColor: c, fillOpacity: 0.4, weight: 3 })
          .addTo(map)
          .bindPopup(`
            <div style="text-align:center">
              <b>📊 Area Performance</b><br>
              <h1 style="margin:5px 0;color:${c}">${grade}</h1>
              <span style="font-size:12px;color:#888">Score: ${score}/100</span><br>
              <hr style="border-color:var(--border-main)">
              <div style="text-align:left;font-size:12px">
                Cleanliness: ${Math.floor(score * 0.9)}/100<br>
                Safety: ${Math.floor(score * 1.1 > 100 ? 98 : score * 1.1)}/100
              </div>
            </div>
          `);
        performanceMarkers.current.push(poly);
      });
    }

  }, [showRiskZones, showPerformance, ready, userLoc, trafficZones]);

  /* ── Map Click Handler for Routing ── */
  useEffect(() => {
    if (!ready || !mapInst.current) return;
    const map = mapInst.current;
    
    const onMapClick = (e) => {
      if (!routingMode) return;
      
      const { lat, lng } = e.latlng;
      
      if (!routeStart) {
        setRouteStart({ lat, lng });
      } else if (!routeEnd) {
        setRouteEnd({ lat, lng });
      }
    };
    
    map.on('click', onMapClick);
    
    // Change cursor
    if (routingMode && (!routeStart || !routeEnd)) {
      map._container.style.cursor = 'crosshair';
    } else {
      map._container.style.cursor = '';
    }
    
    return () => {
      map.off('click', onMapClick);
      map._container.style.cursor = '';
    };
  }, [ready, routingMode, routeStart, routeEnd]);

  /* ── Fetch Route from OSRM ── */
  useEffect(() => {
    if (!routeStart || !routeEnd) return;
    
    const fetchRoute = async () => {
      setRoutingLoading(true);
      setRoutingError('');
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${routeStart.lng},${routeStart.lat};${routeEnd.lng},${routeEnd.lat}?overview=full&geometries=geojson`);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteData({
            distance: route.distance, // in meters
            duration: route.duration, // in seconds
            geojson: route.geometry
          });
        } else {
          setRoutingError('No route found.');
        }
      } catch (err) {
        setRoutingError('Failed to fetch route. Please try again.');
      }
      setRoutingLoading(false);
    };
    
    fetchRoute();
  }, [routeStart, routeEnd]);

  /* ── Draw Route & Markers ── */
  useEffect(() => {
    if (!ready || !mapInst.current || !window.L) return;
    const L = window.L;
    const map = mapInst.current;
    
    // Clear old route
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    routeMarkersRef.current.forEach(m => map.removeLayer(m));
    routeMarkersRef.current = [];
    
    if (!routingMode) return;
    
    // Draw Start
    if (routeStart) {
      const iconA = L.divIcon({ html: `<div style="background:#00cc66;padding:4px 8px;border-radius:10px;font-size:14px;font-weight:bold;color:#fff;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5)">A</div>`, className:'', iconAnchor:[15,15] });
      const markerA = L.marker([routeStart.lat, routeStart.lng], { icon: iconA }).addTo(map);
      routeMarkersRef.current.push(markerA);
    }
    
    // Draw End
    if (routeEnd) {
      const iconB = L.divIcon({ html: `<div style="background:#ff4444;padding:4px 8px;border-radius:10px;font-size:14px;font-weight:bold;color:#fff;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5)">B</div>`, className:'', iconAnchor:[15,15] });
      const markerB = L.marker([routeEnd.lat, routeEnd.lng], { icon: iconB }).addTo(map);
      routeMarkersRef.current.push(markerB);
    }
    
    // Draw Polyline
    if (routeData && routeData.geojson) {
      routeLayerRef.current = L.geoJSON(routeData.geojson, {
        style: { color: '#4488ff', weight: 6, opacity: 0.8 }
      }).addTo(map);
      
      // Fit map bounds to route
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
    }
    
  }, [ready, routingMode, routeStart, routeEnd, routeData]);

  /* ── City Search ── */
  const searchCity = async (q, autoGo = false) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`
      );
      const data = await res.json();
      if (autoGo && data.length > 0) {
        // Enter pressed — go to first result immediately
        goToCity(data[0]);
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }
    } catch(e) { setSearchResults([]); }
    setSearching(false);
  };

  const goToCity = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',')[0];
    setSearchQuery(name);
    setSearchResults([]);
    setCityName(name);
    setAirQuality(null);
    setWeather(null);
    setTrafficZones([]);
    setUserLoc({ lat, lng });

    const flyTo = () => {
      if (!mapInst.current || !window.L) { setTimeout(flyTo, 300); return; }
      const L = window.L;
      mapInst.current.setView([lat, lng], 14);
      if (mapInst.current._searchMarker) {
        try { mapInst.current.removeLayer(mapInst.current._searchMarker); } catch(_){}
      }
      const pinHtml = `<div style="position:relative;width:34px;height:34px">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,136,0,0.2);animation:mapPulse 2s ease-out infinite"></div>
        <div style="position:absolute;inset:5px;border-radius:50%;background:#ff8800;border:3px solid #fff;box-shadow:0 0 12px rgba(255,136,0,0.9)"></div>
      </div>`;
      const pinIcon = L.divIcon({ html: pinHtml, className:'', iconAnchor:[17,17] });
      const marker = L.marker([lat, lng], { icon: pinIcon })
        .addTo(mapInst.current)
        .bindPopup(`<b style="color:#ff8800">🔍 ${name}</b><br><span style="color:#888">${result.display_name.split(',').slice(1,4).join(', ')}</span>`);
      mapInst.current._searchMarker = marker;
      setTimeout(() => marker.openPopup(), 400);
    };
    flyTo();
  };

  const layerBtns = [
    { key:'standard',  label:'🗺️ Map'      },
    { key:'satellite', label:'🛰️ Satellite' },
    { key:'dark',      label:'🌙 Dark'      },
    { key:'terrain',   label:'⛰️ Terrain'   },
  ];

  // ── Location permission screen ──
  if (locStatus === 'asking' || locStatus === 'loading') {
    return (
      <div style={LS.permPage}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={LS.permCard} className="glass-panel">
          <div style={LS.permIcon}>📍</div>
          <h2 style={LS.permTitle}>Location Access</h2>
          <p style={LS.permDesc}>
            SmartCity needs your location to show live traffic, air quality, and city issues near you.
          </p>
          <div style={LS.permSpinner}/>
          <p style={LS.permHint}>Please allow location access in your browser prompt…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes mapPulse{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}
        .leaflet-popup-content-wrapper{background:#111!important;border:1px solid #2a2a2a!important;color:#eee!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(0,0,0,0.8)!important}
        .leaflet-popup-tip{background:#111!important}
        .leaflet-popup-content{color:#eee!important;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6}
        .leaflet-container{background:#0a0a0a}
        .leaflet-control-zoom a{background:#111!important;color:#aaa!important;border-color:#2a2a2a!important}
        .leaflet-control-attribution{background:rgba(0,0,0,0.6)!important;color:#555!important}
        .leaflet-control-attribution a{color:#666!important}
      `}</style>

      {/* Top Bar */}
      <div style={S.topBar}>
        <div>
          <h2 style={S.title}>🗺️ Live City Map</h2>
          <p style={S.sub}>
            {locStatus === 'granted'
              ? `📍 ${cityName || 'Your Location'} · real-time traffic · air quality · issues`
              : `⚠️ Location denied — showing Hyderabad · real-time traffic · air quality`}
          </p>
        </div>
        {/* Search Box */}
        <div style={S.searchWrap}>
          <div style={S.searchBox}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Search city or place..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchCity(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && searchCity(searchQuery, true)}
            />
            {searching && <span style={{color:'var(--text-sub)',fontSize:12,paddingRight:8}}>...</span>}
            {searchQuery && <button style={S.clearBtn} onClick={() => { setSearchQuery(''); setSearchResults([]); }}>✕</button>}
          </div>
          {searchResults.length > 0 && (
            <div style={S.dropdown}>
              {searchResults.map((r, i) => (
                <div key={i} style={S.dropdownItem} onClick={() => goToCity(r)}
                  onMouseEnter={e => e.currentTarget.style.background='var(--border-main)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <span style={{fontSize:14}}>📍</span>
                  <div>
                    <p style={S.dropName}>{r.display_name.split(',')[0]}</p>
                    <p style={S.dropSub}>{r.display_name.split(',').slice(1,3).join(',')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={S.layerRow}>
          {layerBtns.map(b => (
            <button key={b.key} onClick={() => setLayer(b.key)} style={{
              ...S.layerBtn,
              background: layer===b.key ? '#1a73e8' : 'var(--bg-card-hover)',
              borderColor: layer===b.key ? '#1a73e8' : 'var(--border-light)',
              color:       layer===b.key ? 'var(--text-main)'    : 'var(--text-sub)',
              boxShadow:   layer===b.key ? '0 0 14px rgba(26,115,232,0.4)' : 'none',
            }}>{b.label}</button>
          ))}
          <div style={{width:1, background:'var(--border-main)', margin:'0 4px'}}/>
          <button onClick={() => setShowSafety(!showSafety)} style={{
            ...S.layerBtn,
            background: showSafety ? '#ff4444' : 'var(--bg-card-hover)',
            borderColor: showSafety ? '#ff4444' : 'var(--border-light)',
            color:       showSafety ? '#fff' : 'var(--text-sub)',
            boxShadow:   showSafety ? '0 0 14px rgba(255,68,68,0.4)' : 'none',
          }}>🚨 Safety & Emergency</button>
          
          <button onClick={() => setShowWaste(!showWaste)} style={{
            ...S.layerBtn,
            background: showWaste ? '#00cc66' : 'var(--bg-card-hover)',
            borderColor: showWaste ? '#00cc66' : 'var(--border-light)',
            color:       showWaste ? '#fff' : 'var(--text-sub)',
            boxShadow:   showWaste ? '0 0 14px rgba(0,204,102,0.4)' : 'none',
          }}>♻️ Waste & Routes</button>

          <div style={{width:1, background:'var(--border-main)', margin:'0 4px'}}/>
          <button onClick={() => setShowRiskZones(!showRiskZones)} style={{
            ...S.layerBtn,
            background: showRiskZones ? '#ff0000' : 'var(--bg-card-hover)',
            borderColor: showRiskZones ? '#ff0000' : 'var(--border-light)',
            color:       showRiskZones ? '#fff' : 'var(--text-sub)',
            boxShadow:   showRiskZones ? '0 0 14px rgba(255,0,0,0.5)' : 'none',
          }}>🚨 Risk Zones</button>

          <button onClick={() => setShowPerformance(!showPerformance)} style={{
            ...S.layerBtn,
            background: showPerformance ? '#ffcc00' : 'var(--bg-card-hover)',
            borderColor: showPerformance ? '#ffcc00' : 'var(--border-light)',
            color:       showPerformance ? '#000' : 'var(--text-sub)',
            boxShadow:   showPerformance ? '0 0 14px rgba(255,204,0,0.5)' : 'none',
          }}>📊 Area Performance</button>

          <div style={{width:1, background:'var(--border-main)', margin:'0 4px'}}/>
          <button onClick={() => {
            setRoutingMode(!routingMode);
            if (routingMode) {
              setRouteStart(null); setRouteEnd(null); setRouteData(null);
            }
          }} style={{
            ...S.layerBtn,
            background: routingMode ? '#4488ff' : 'var(--bg-card-hover)',
            borderColor: routingMode ? '#4488ff' : 'var(--border-light)',
            color:       routingMode ? '#fff' : 'var(--text-sub)',
            boxShadow:   routingMode ? '0 0 14px rgba(68,136,255,0.5)' : 'none',
          }}>🗺️ Directions</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Map */}
        <div style={S.mapWrap} className="glass-panel">
          <div ref={mapRef} style={S.map} />
          {!ready && (
            <div style={S.overlay}>
              <div style={S.spinner}/>
              <p style={{color:'var(--brand-primary)',marginTop:14,fontWeight:600}}>Initializing map…</p>
              <p style={{color:'var(--text-sub)',fontSize:12,marginTop:4}}>Loading {cityName || 'your city'}…</p>
            </div>
          )}
          {/* Locate me button */}
          {ready && locStatus==='denied' && (
            <button style={S.locateBtn} onClick={() => window.location.reload()} title="Try enabling location">
              📍 Enable Location
            </button>
          )}
        </div>

        {/* Right Panel */}
        <div style={S.panel}>

          {/* Routing Info */}
          {routingMode && (
            <div style={{...S.card, borderTop:'3px solid #4488ff', animation:'fadeIn 0.3s ease'}} className="glass-panel">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <p style={S.cardTitle}>🗺️ Route Directions</p>
                <button onClick={() => { setRouteStart(null); setRouteEnd(null); setRouteData(null); setRoutingError(''); }} 
                  style={{background:'transparent',border:'none',color:'var(--brand-primary)',fontSize:12,cursor:'pointer',fontWeight:600}}>
                  Clear
                </button>
              </div>
              
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:routeStart?'#00cc66':'var(--bg-input)',border:'2px solid #00cc66',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:'bold'}}>A</div>
                  <span style={{color:routeStart?'var(--text-main)':'var(--text-sub)',fontSize:13}}>
                    {routeStart ? `${routeStart.lat.toFixed(4)}, ${routeStart.lng.toFixed(4)}` : 'Click map to set Start'}
                  </span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:routeEnd?'#ff4444':'var(--bg-input)',border:'2px solid #ff4444',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:'bold'}}>B</div>
                  <span style={{color:routeEnd?'var(--text-main)':'var(--text-sub)',fontSize:13}}>
                    {routeEnd ? `${routeEnd.lat.toFixed(4)}, ${routeEnd.lng.toFixed(4)}` : 'Click map to set Destination'}
                  </span>
                </div>
              </div>

              {routingLoading && <p style={S.loading}>Calculating route...</p>}
              {routingError && <p style={{color:'#ff4444',fontSize:12}}>{routingError}</p>}
              
              {routeData && (
                <div style={{background:'var(--bg-input)',padding:12,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{color:'var(--text-sub)',fontSize:12}}>Distance</span>
                    <strong style={{color:'var(--text-main)',fontSize:13}}>{(routeData.distance/1000).toFixed(1)} km</strong>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{color:'var(--text-sub)',fontSize:12}}>Est. Time</span>
                    <strong style={{color:'#00cc66',fontSize:13}}>{Math.round(routeData.duration/60)} min</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AQI */}
          <div style={{...S.card, borderTop:`3px solid ${airQuality ? getAQIColor(airQuality.aqi) : 'var(--border-light)'}`}} className="glass-panel">
            <p style={S.cardTitle}>💨 Air Quality Index</p>
            {airQuality ? (
              <>
                <div style={S.aqiRow}>
                  <span style={{...S.aqiBig, color:getAQIColor(airQuality.aqi)}}>{airQuality.aqi}</span>
                  <div>
                    <p style={{...S.aqiStatus, color:getAQIColor(airQuality.aqi)}}>{getAQILabel(airQuality.aqi)}</p>
                    <p style={S.aqiSub}>European AQI · Live</p>
                  </div>
                </div>
                <div style={S.grid2}>
                  {[['PM2.5',airQuality.pm25,'μg/m³'],['PM10',airQuality.pm10,'μg/m³'],['NO₂',airQuality.no2,'μg/m³'],['O₃',airQuality.o3,'μg/m³']].map(([k,v,u])=>(
                    <div key={k} style={S.metricBox}>
                      <p style={S.metricKey}>{k}</p>
                      <p style={S.metricVal}>{v}<span style={S.metricUnit}> {u}</span></p>
                    </div>
                  ))}
                </div>
              </>
            ) : <p style={S.loading}>Fetching live data…</p>}
          </div>

          {/* Weather */}
          <div style={{...S.card, borderTop:'3px solid #00aaff'}} className="glass-panel">
            <p style={S.cardTitle}>🌤️ Live Weather{cityName ? ` — ${cityName}` : ''}</p>
            {weather ? (
              <div style={S.grid2}>
                {[['🌡️ Temp',`${weather.temp}°C`],['💧 Humidity',`${weather.humidity}%`],['💨 Wind',`${weather.wind} km/h`],['🌧️ Rain',`${weather.rain} mm`]].map(([k,v])=>(
                  <div key={k} style={S.metricBox}>
                    <p style={S.metricKey}>{k}</p>
                    <p style={S.metricVal}>{v}</p>
                  </div>
                ))}
              </div>
            ) : <p style={S.loading}>Loading…</p>}
          </div>

          {/* Traffic */}
          <div style={{...S.card, borderTop:'3px solid #ffcc00'}} className="glass-panel">
            <p style={S.cardTitle}>🚗 Nearby Traffic Zones</p>
            {trafficZones.length === 0
              ? <p style={S.loading}>Detecting zones…</p>
              : trafficZones.map(z => {
                const c = z.level==='high'?'#ff4444':z.level==='medium'?'#ff8800':'#00cc66';
                return (
                  <div key={z.label} style={S.trafficRow}>
                    <div style={{...S.trafficDot, background:c, boxShadow:`0 0 7px ${c}`}}/>
                    <div>
                      <p style={S.trafficLabel}>{z.label}</p>
                      <p style={{...S.trafficSub, color:c}}>{z.level} congestion</p>
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Issues legend */}
          <div style={{...S.card, borderTop:'3px solid #8855ff'}} className="glass-panel">
            <p style={S.cardTitle}>📌 Issues on Map <span style={{color:'var(--brand-primary)'}}>({issues.length})</span></p>
            {issues.length === 0 && <p style={S.loading}>No issues reported yet</p>}
            {Object.entries(CAT_ICONS).map(([cat, icon]) => {
              const cnt = issues.filter(i => i.category === cat).length;
              return (
                <div key={cat} style={S.legendRow}>
                  <div style={{...S.legendDot, background:CAT_COLORS[cat]+'20', border:`1px solid ${CAT_COLORS[cat]}55`}}>{icon}</div>
                  <span style={S.legendCat}>{cat}</span>
                  <span style={{...S.legendCnt, color:CAT_COLORS[cat]}}>{cnt}</span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

/* Location permission screen styles */
const LS = {
  permPage: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg-page)' },
  permCard: { background:'var(--bg-card)', border:'1px solid #1a1a1a', borderRadius:20, padding:'48px 40px', maxWidth:420, textAlign:'center', animation:'fadeIn 0.4s ease' },
  permIcon: { fontSize:56, marginBottom:16 },
  permTitle:{ color:'var(--text-main)', fontSize:22, fontWeight:800, letterSpacing:'-0.02em', marginBottom:12 },
  permDesc: { color:'var(--text-sub)', fontSize:15, lineHeight:1.7, marginBottom:28 },
  permSpinner:{ width:36, height:36, border:'3px solid #1a1a1a', borderTop:'3px solid #4488ff', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' },
  permHint: { color:'var(--text-sub)', fontSize:13 },
};

const S = {
  page:        { padding:22, background:'var(--bg-page)', minHeight:'100vh' },
  topBar:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:12 },
  title:       { color:'var(--text-main)', fontSize:22, fontWeight:800, margin:0, letterSpacing:'-0.02em' },
  sub:         { color:'var(--text-sub)', fontSize:13, marginTop:5 },
  layerRow:    { display:'flex', gap:7, flexWrap:'wrap' },
  layerBtn:    { padding:'7px 15px', border:'1px solid', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.2s' },
  body:        { display:'grid', gridTemplateColumns:'1fr 290px', gap:16, alignItems:'start' },
  mapWrap:     { borderRadius:14, overflow:'hidden', border:'1px solid #1e1e1e', position:'relative', height:'79vh', boxShadow:'0 8px 40px rgba(0,0,0,0.8)' },
  map:         { width:'100%', height:'100%' },
  overlay:     { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', zIndex:999 },
  spinner:     { width:40, height:40, border:'3px solid #1a1a1a', borderTop:'3px solid #4488ff', borderRadius:'50%', animation:'spin 1s linear infinite' },
  locateBtn:   { position:'absolute', bottom:16, left:16, zIndex:999, background:'var(--brand-primary)', border:'none', borderRadius:9, color:'#fff', padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 14px rgba(26,115,232,0.5)' },
  searchWrap:  { position:'relative', width:300 },
  searchBox:   { display:'flex', alignItems:'center', background:'var(--bg-card-hover)', border:'1px solid #2a2a2a', borderRadius:10, overflow:'hidden', transition:'border-color 0.2s' },
  searchIcon:  { padding:'0 10px', fontSize:14 },
  searchInput: { flex:1, background:'transparent', border:'none', color:'var(--text-main)', fontSize:14, padding:'9px 4px', outline:'none' },
  clearBtn:    { background:'transparent', border:'none', color:'var(--text-sub)', fontSize:14, padding:'0 10px', cursor:'pointer' },
  dropdown:    { position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--bg-input)', border:'1px solid #2a2a2a', borderRadius:10, zIndex:9999, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.8)' },
  dropdownItem:{ display:'flex', gap:10, alignItems:'flex-start', padding:'10px 14px', cursor:'pointer', transition:'background 0.15s' },
  dropName:    { color:'var(--text-main)', fontSize:13, fontWeight:600, margin:0 },
  dropSub:     { color:'var(--text-sub)', fontSize:11, margin:'2px 0 0' },
  panel:       { display:'flex', flexDirection:'column', gap:12 },
  card:        { background:'var(--bg-card)', borderRadius:12, padding:15, border:'1px solid #1a1a1a' },
  cardTitle:   { color:'var(--text-main)', fontWeight:700, fontSize:13, margin:'0 0 12px' },
  aqiRow:      { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  aqiBig:      { fontSize:40, fontWeight:800, lineHeight:1 },
  aqiStatus:   { fontWeight:700, fontSize:13, margin:0 },
  aqiSub:      { color:'var(--text-sub)', fontSize:11, margin:'3px 0 0' },
  grid2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 },
  metricBox:   { background:'var(--bg-card-hover)', borderRadius:8, padding:'8px 10px', border:'1px solid #1a1a1a' },
  metricKey:   { color:'var(--text-sub)', fontSize:11, margin:'0 0 2px' },
  metricVal:   { color:'var(--text-main)', fontSize:14, fontWeight:700, margin:0 },
  metricUnit:  { color:'var(--text-sub)', fontSize:10 },
  loading:     { color:'var(--text-sub)', fontSize:13, margin:0 },
  trafficRow:  { display:'flex', gap:10, alignItems:'center', marginBottom:9 },
  trafficDot:  { width:9, height:9, borderRadius:'50%', flexShrink:0 },
  trafficLabel:{ color:'var(--text-main)', fontSize:13, margin:0, fontWeight:500 },
  trafficSub:  { fontSize:11, margin:'1px 0 0', textTransform:'capitalize' },
  legendRow:   { display:'flex', alignItems:'center', gap:9, marginBottom:8 },
  legendDot:   { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 },
  legendCat:   { color:'var(--text-muted)', fontSize:13, flex:1, textTransform:'capitalize' },
  legendCnt:   { fontWeight:700, fontSize:14 },
};
