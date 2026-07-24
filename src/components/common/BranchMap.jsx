import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Phone, Clock, Mail, Navigation, Search } from 'lucide-react';
import { BRANCH_INFO } from '../../utils/constants';
import { getMapBranches } from '../../services/supabaseApi';

const TICANO_RED = '#CE313C';
const CHARCOAL = '#373435';
const BOTSWANA_BOUNDS = [[-26.95, 19.95], [-17.75, 29.45]];

// Fallback to the static constant only if the live directory is unavailable.
const fallbackBranches = () =>
  Object.entries(BRANCH_INFO)
    .filter(([, b]) => typeof b.lat === 'number' && typeof b.lng === 'number')
    .map(([key, b]) => ({ name: b.name || key, address: b.address, phone: b.phone, hours: b.hours, email: b.email, lat: b.lat, lng: b.lng }));

export default function BranchMap({ userLocation = null }) {
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef({});

  // Load branches from the unified directory (admin-created ones included).
  useEffect(() => {
    let alive = true;
    getMapBranches()
      .then(({ data }) => {
        if (!alive) return;
        const list = (data && data.length)
          ? data.map((b) => ({ name: b.name, address: b.address, phone: b.phone, hours: b.openHours, email: b.email, lat: b.lat, lng: b.lng }))
          : fallbackBranches();
        setBranches(list);
        setSelected((s) => s || list[0]?.name || null);
      })
      .catch(() => {
        const list = fallbackBranches();
        setBranches(list);
        setSelected((s) => s || list[0]?.name || null);
      });
    return () => { alive = false; };
  }, []);

  // Build the Leaflet map once branches have loaded.
  useEffect(() => {
    if (mapRef.current || !containerRef.current || branches.length === 0) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    map.fitBounds(BOTSWANA_BOUNDS);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    branches.forEach((b) => {
      const marker = L.circleMarker([b.lat, b.lng], { radius: 9, weight: 3, color: '#fff', fillColor: CHARCOAL, fillOpacity: 1 }).addTo(map);
      marker.bindTooltip(b.name, { direction: 'top', offset: [0, -8] });
      marker.bindPopup(
        `<div style="min-width:160px"><strong style="color:${TICANO_RED}">${b.name}</strong><br/>
         <span style="color:#475569;font-size:12px">${b.address || ''}</span><br/>
         <span style="font-size:12px">${b.phone || ''}</span><br/>
         <span style="font-size:12px">${b.hours || ''}</span></div>`
      );
      marker.on('click', () => setSelected(b.name));
      markersRef.current[b.name] = marker;
    });

    if (userLocation && typeof userLocation.lat === 'number') {
      L.circleMarker([userLocation.lat, userLocation.lng], { radius: 7, weight: 2, color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9 })
        .addTo(map).bindTooltip('You are here', { direction: 'top' });
    }

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; markersRef.current = {}; };
  }, [branches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect selection: restyle + fly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    Object.entries(markersRef.current).forEach(([name, marker]) => {
      const isSel = name === selected;
      marker.setStyle({ fillColor: isSel ? TICANO_RED : CHARCOAL, radius: isSel ? 12 : 9 });
      if (isSel) marker.bringToFront();
    });
    const b = branches.find((x) => x.name === selected);
    if (b) { map.flyTo([b.lat, b.lng], 11, { duration: 0.8 }); markersRef.current[selected]?.openPopup(); }
  }, [selected, branches]);

  const branch = branches.find((b) => b.name === selected) || null;
  const q = query.trim().toLowerCase();
  const filtered = branches.filter((b) =>
    !q || b.name.toLowerCase().includes(q) || (b.address || '').toLowerCase().includes(q) || (b.phone || '').includes(query.trim())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
        <p className="font-semibold text-ticano-charcoal dark:text-white text-sm mb-3 flex items-center gap-2">
          <MapPin size={15} className="text-ticano-red" /> Ticano Branch Locations, Botswana
        </p>
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 z-0 bg-gray-50 dark:bg-gray-800" style={{ height: 420 }}>
          {branches.length === 0 && <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading map…</div>}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {branches.map((b) => (
            <button key={b.name} onClick={() => setSelected(b.name)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 font-medium ${selected === b.name ? 'bg-ticano-red text-white border-ticano-red' : 'border-gray-200 text-gray-500 hover:border-ticano-red/50 dark:border-gray-600 dark:text-gray-400'}`}>
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {branch && (
          <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-ticano-red rounded-xl flex items-center justify-center shrink-0"><MapPin size={18} className="text-white" /></div>
              <div><h3 className="font-bold text-ticano-charcoal dark:text-white">{branch.name}</h3><p className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</p></div>
            </div>
            <div className="space-y-3">
              {[[Phone, 'Phone', branch.phone], [Clock, 'Hours', branch.hours], [Mail, 'Email', branch.email]].map(([Icon, lab, val]) => (
                <div key={lab} className="flex items-center gap-3 text-sm">
                  <Icon size={14} className="text-ticano-red shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 w-10 shrink-0">{lab}</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{val || '-'}</span>
                </div>
              ))}
            </div>
            <a href={`https://www.openstreetmap.org/?mlat=${branch.lat}&mlon=${branch.lng}#map=14/${branch.lat}/${branch.lng}`} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-ticano-charcoal text-white rounded-xl text-sm font-medium hover:bg-black transition-colors">
              <Navigation size={13} /> Get directions
            </a>
          </div>
        )}

        <div className="bg-white dark:bg-ticano-dark-card rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search branches by name, area or phone…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-ticano-red" />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{q ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : 'All Branches'}</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No branches match “{query}”.</p>
            ) : filtered.map((b) => (
              <button key={b.name} onClick={() => setSelected(b.name)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-150 ${selected === b.name ? 'bg-ticano-red/8 border border-ticano-red/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Navigation size={13} className={selected === b.name ? 'text-ticano-red' : 'text-gray-400'} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${selected === b.name ? 'text-ticano-red' : 'text-gray-700 dark:text-gray-200'}`}>{b.name}</p>
                  <p className="text-xs text-gray-400 truncate">{b.address || b.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
