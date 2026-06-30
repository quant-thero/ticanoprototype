import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

const TICANO_RED = '#CE313C';
const BOTSWANA_CENTER = [-22.0, 24.0];
const BOTSWANA_BOUNDS = [[-26.95, 19.95], [-17.75, 29.45]];

/**
 * Lets an Admin set a branch's map location either by:
 *   A) clicking / dragging the marker on the Botswana map, or
 *   B) geocoding the typed address ("Locate from address").
 * Calls onChange({ lat, lng }) whenever the point moves.
 */
export default function BranchLocationPicker({ lat, lng, address, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const place = (la, ln, fly = true) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = L.circleMarker([la, ln], {
        radius: 11, weight: 3, color: '#fff', fillColor: TICANO_RED, fillOpacity: 1,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([la, ln]);
    }
    if (fly) map.setView([la, ln], Math.max(map.getZoom(), 10));
    onChange?.({ lat: Number(la.toFixed(5)), lng: Number(ln.toFixed(5)) });
  };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    if (typeof lat === 'number' && typeof lng === 'number') map.setView([lat, lng], 11);
    else map.fitBounds(BOTSWANA_BOUNDS);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (typeof lat === 'number' && typeof lng === 'number') place(lat, lng, false);

    map.on('click', (e) => place(e.latlng.lat, e.latlng.lng, false));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Option B — geocode the typed address via OpenStreetMap Nominatim.
  const locateFromAddress = async () => {
    const q = [address, 'Botswana'].filter(Boolean).join(', ');
    if (!address || !address.trim()) { setGeoError('Enter an address first.'); return; }
    setGeocoding(true); setGeoError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bw&q=${encodeURIComponent(q)}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (data && data.length) {
        place(parseFloat(data[0].lat), parseFloat(data[0].lon), true);
      } else {
        setGeoError('Could not find that address. Place the pin manually.');
      }
    } catch {
      setGeoError('Geocoding unavailable. Place the pin manually on the map.');
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={12} className="text-ticano-red" /> Click the map (or drag the address in) to set the branch location.</p>
        <button type="button" onClick={locateFromAddress} disabled={geocoding}
          className="flex items-center gap-1.5 text-xs font-medium text-ticano-red hover:underline disabled:opacity-50">
          {geocoding ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />} Locate from address
        </button>
      </div>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 z-0" style={{ height: 240 }} />
      {geoError && <p className="text-xs text-amber-600 mt-1">{geoError}</p>}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Latitude</label>
          <input type="number" step="0.00001" value={lat ?? ''} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) place(v, lng ?? BOTSWANA_CENTER[1], true); else onChange?.({ lat: null, lng }); }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white" placeholder="-24.65" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longitude</label>
          <input type="number" step="0.00001" value={lng ?? ''} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) place(lat ?? BOTSWANA_CENTER[0], v, true); else onChange?.({ lat, lng: null }); }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white" placeholder="25.91" />
        </div>
      </div>
    </div>
  );
}
