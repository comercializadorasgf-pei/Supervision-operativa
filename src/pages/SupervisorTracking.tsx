import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { User, Visit } from '../types';

// Mapbox Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Simulación de datos GPS dinámicos extendida con datos de Supabase
interface SupervisorLoc extends User {
    status: 'active' | 'inactive';
    currentTask: string;
    lat: number;
    lng: number;
    lastUpdate: string;
    routeHistory: { lat: number, lng: number }[];
    deviceId?: string;
    visitHistory: Visit[];
    direction?: { lat: number, lng: number };
}

interface GroundingData {
    place: string;
    address: string;
    rating: number;
    userRatingsTotal: number;
    uri: string;
    snippet: string;
}

const SupervisorTracking = () => {
    const [supervisors, setSupervisors] = useState<SupervisorLoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [showRoutes, setShowRoutes] = useState(true);
    const [selectedSup, setSelectedSup] = useState<string | null>(null);

    // Maps & AI Grounding State
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const markersRef = useRef<{ [key: string]: any }>({});

    const [groundingData, setGroundingData] = useState<GroundingData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 1. Load Real Data from Supabase
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [allUsers, allVisits] = await Promise.all([
                    StorageService.getUsers(),
                    StorageService.getVisits()
                ]);

                const sups = allUsers
                    .filter(u => u.role === 'supervisor')
                    .map((u, idx) => {
                        // Mock initial positions based on user count for variety
                        const baseLat = 4.61 + (Math.random() - 0.5) * 0.05; // Bogotá
                        const baseLng = -74.08 + (Math.random() - 0.5) * 0.05;

                        // Get recent visits for this supervisor
                        const history = allVisits
                            .filter(v => v.supervisorId === u.id && v.status === 'Completed')
                            .slice(0, 5);

                        const currentVisit = allVisits.find(v => v.supervisorId === u.id && v.status === 'In Progress');

                        return {
                            ...u,
                            status: idx % 3 === 2 ? 'inactive' : 'active',
                            currentTask: currentVisit ? `Visita: ${currentVisit.clientName}` : (idx % 3 === 2 ? 'Fuera de turno' : 'En traslado'),
                            lat: baseLat,
                            lng: baseLng,
                            lastUpdate: 'Ahora mismo',
                            routeHistory: [],
                            deviceId: `GPS-${1000 + idx}`,
                            direction: {
                                lat: (Math.random() - 0.5) * 0.0005,
                                lng: (Math.random() - 0.5) * 0.0005
                            },
                            visitHistory: history
                        } as SupervisorLoc;
                    });

                setSupervisors(sups);
            } catch (error) {
                console.error('Error loading supervisors for tracking', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // 2. Initialize Mapbox
    useEffect(() => {
        if (!mapRef.current || !MAPBOX_TOKEN) {
            if (!MAPBOX_TOKEN) setMapError("Configuración requerida: Mapbox Token no detectado.");
            return;
        }

        try {
            // @ts-ignore
            const mapboxgl = window.mapboxgl;
            if (!mapboxgl) {
                setMapError("Mapbox Library not loaded.");
                return;
            }

            mapboxgl.accessToken = MAPBOX_TOKEN;
            const map = new mapboxgl.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/dark-v11', // Professional dark style
                center: [-74.08, 4.61], // Bogotá
                zoom: 12
            });

            map.addControl(new mapboxgl.NavigationControl());

            map.on('load', () => {
                setMapInstance(map);
            });

            return () => map.remove();
        } catch (e) {
            console.error("Map initialization error", e);
            setMapError("Error al inicializar el mapa.");
        }
    }, []);

    // 3. Simular movimiento GPS (Mocked for demo but syncs with state)
    useEffect(() => {
        const interval = setInterval(() => {
            setSupervisors(prev => prev.map(sup => {
                if (sup.status === 'inactive') return sup;

                const newHistory = [...sup.routeHistory, { lat: sup.lat, lng: sup.lng }].slice(-100);
                const dirLat = sup.direction?.lat || 0.0001;
                const dirLng = sup.direction?.lng || 0.0001;
                const jitter = (Math.random() - 0.5) * 0.00005;

                return {
                    ...sup,
                    lat: sup.lat + dirLat + jitter,
                    lng: sup.lng + dirLng + jitter,
                    lastUpdate: 'Ahora mismo',
                    routeHistory: newHistory
                };
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // 4. Update Markers & Routes
    useEffect(() => {
        if (!mapInstance) return;

        // @ts-ignore
        const mapboxgl = window.mapboxgl;

        supervisors.forEach(sup => {
            const coords: [number, number] = [sup.lng, sup.lat];

            // Create or update marker
            if (!markersRef.current[sup.id]) {
                const el = document.createElement('div');
                el.className = 'custom-marker';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                el.style.backgroundColor = sup.status === 'active' ? '#22c55e' : '#94a3b8';

                const marker = new mapboxgl.Marker(el)
                    .setLngLat(coords)
                    .addTo(mapInstance);

                el.addEventListener('click', () => {
                    setSelectedSup(sup.id);
                    mapInstance.flyTo({ center: coords, zoom: 15 });
                });

                markersRef.current[sup.id] = { marker, element: el };
            } else {
                const { marker, element } = markersRef.current[sup.id];
                marker.setLngLat(coords);
                element.style.backgroundColor = sup.id === selectedSup ? '#137fec' : (sup.status === 'active' ? '#22c55e' : '#94a3b8');
                element.style.zIndex = sup.id === selectedSup ? '100' : '1';
                element.style.transform = sup.id === selectedSup ? 'scale(1.3)' : 'scale(1)';
            }

            // Update route layer
            const routeId = `route-${sup.id}`;
            const sourceId = `source-${sup.id}`;

            if (showRoutes && sup.routeHistory.length > 1) {
                const path = [...sup.routeHistory, { lat: sup.lat, lng: sup.lng }].map(p => [p.lng, p.lat]);

                if (mapInstance.getSource(sourceId)) {
                    mapInstance.getSource(sourceId).setData({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: path }
                    });
                } else {
                    mapInstance.addSource(sourceId, {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: path }
                        }
                    });
                    mapInstance.addLayer({
                        id: routeId,
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': sup.id === selectedSup ? '#137fec' : (sup.status === 'active' ? '#22c55e' : '#94a3b8'),
                            'line-width': sup.id === selectedSup ? 5 : 3,
                            'line-opacity': 0.6
                        }
                    });
                }
            } else if (!showRoutes && mapInstance.getLayer(routeId)) {
                mapInstance.removeLayer(routeId);
                mapInstance.removeSource(sourceId);
            }
        });
    }, [supervisors, mapInstance, selectedSup, showRoutes]);

    const handleAnalyzeLocation = (sup: SupervisorLoc) => {
        setIsAnalyzing(true);
        setGroundingData(null);
        setTimeout(() => {
            setGroundingData({
                place: "Punto de Control Operativo",
                address: `Lat: ${sup.lat.toFixed(4)}, Lng: ${sup.lng.toFixed(4)}`,
                rating: 4.5,
                userRatingsTotal: 128,
                uri: `https://www.google.com/maps/search/?api=1&query=${sup.lat},${sup.lng}`,
                snippet: "Ubicación detectada en zona comercial. Actividad operativa normal reportada."
            });
            setIsAnalyzing(false);
        }, 1500);
    };

    const handleLinkDevice = () => {
        const id = prompt("Ingrese ID del dispositivo GPS:");
        if (id) alert(`Dispositivo ${id} vinculado.`);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-full relative">
                {/* Mobile Header Overlay */}
                <div className="absolute top-0 left-0 right-0 z-20 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-800 md:hidden flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-md text-slate-500">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <Link to="/" className="p-1 rounded-md text-slate-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Rastreo GPS</span>
                    </div>
                </div>

                <div className="absolute top-4 left-4 z-20 hidden md:flex">
                    <Link to="/" className="bg-white dark:bg-surface-dark p-2.5 rounded-full shadow-2xl text-slate-500 hover:text-primary transition-all active:scale-95">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                </div>

                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden pt-14 md:pt-0">
                    <aside className="w-full md:w-[380px] flex flex-col bg-white dark:bg-surface-dark border-r border-slate-100 dark:border-slate-800 z-10 shadow-2xl h-1/3 md:h-full">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="font-black text-slate-900 dark:text-white text-xl">Monitor Real-Time</h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Servidor Activo</p>
                                </div>
                            </div>
                            <button onClick={handleLinkDevice} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-primary hover:bg-primary hover:text-white transition-all">
                                <span className="material-symbols-outlined">add_link</span>
                            </button>
                        </div>

                        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={showRoutes}
                                        onChange={(e) => setShowRoutes(e.target.checked)}
                                        className="size-5 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Ver Trazo de Rutas</span>
                            </label>
                        </div>

                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                            {supervisors.map(sup => (
                                <div
                                    key={sup.id}
                                    onClick={() => setSelectedSup(selectedSup === sup.id ? null : sup.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col gap-4 transition-all duration-300 ${selectedSup === sup.id ? 'bg-primary/5 border-primary shadow-lg' : 'bg-white dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="relative shrink-0">
                                            <img src={sup.avatarUrl || `https://ui-avatars.com/api/?name=${sup.name}`} alt={sup.name} className="size-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                                            <div className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white dark:border-slate-800 ${sup.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-400'}`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate pr-2 uppercase">{sup.name}</h3>
                                                <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">{sup.lastUpdate}</span>
                                            </div>
                                            <p className="text-xs font-bold text-primary truncate mt-1">{sup.currentTask}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 uppercase tracking-tighter">{sup.deviceId}</span>
                                                {sup.status === 'active' && <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">sensors</span> Transmitiendo</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedSup === sup.id && (
                                        <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 fade-in duration-300">
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</h4>
                                                <span className="material-symbols-outlined text-slate-300 text-sm">history_edu</span>
                                            </div>
                                            <div className="space-y-2">
                                                {sup.visitHistory.length > 0 ? sup.visitHistory.map(v => (
                                                    <div key={v.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-[11px] font-black text-slate-900 dark:text-white truncate pr-2">{v.clientName}</p>
                                                            <p className="text-[9px] font-black text-slate-400 tabular-nums">{v.date}</p>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-500">{v.type}</p>
                                                    </div>
                                                )) : (
                                                    <div className="py-4 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                                        <p className="text-[10px] font-bold text-slate-400 italic">No hay registros hoy</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="flex-1 relative bg-slate-200 dark:bg-[#0a0f14] overflow-hidden">
                        <div ref={mapRef} className="absolute inset-0 w-full h-full" />

                        {mapError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md z-10 p-10 text-center">
                                <div className="max-w-md">
                                    <div className="size-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-xl border border-red-200 dark:border-red-800">
                                        <span className="material-symbols-outlined text-5xl">person_pin_circle</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">MAPS RESTRICTED</h3>
                                    <p className="text-sm font-bold text-slate-500 mb-8 uppercase tracking-tight">{mapError}</p>

                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl text-left shadow-2xl border border-slate-200 dark:border-slate-700">
                                        <p className="font-black text-slate-900 dark:text-white mb-4 uppercase text-xs tracking-widest">Configuración de Seguridad:</p>
                                        <div className="space-y-4 font-bold text-slate-600 dark:text-slate-400 text-sm">
                                            <div className="flex gap-3">
                                                <span className="size-6 bg-primary text-white flex items-center justify-center rounded-full shrink-0">1</span>
                                                <p>Establecer <code>VITE_GOOGLE_MAPS_API_KEY</code> en su archivo <code>.env.local</code>.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="size-6 bg-primary text-white flex items-center justify-center rounded-full shrink-0">2</span>
                                                <p>Habilitar <strong>Maps JavaScript API</strong> en Google Cloud Console.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedSup && !mapError && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:bottom-auto md:top-8 md:right-8 z-30 w-[320px] bg-white dark:bg-surface-dark rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-4 bg-primary text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">psychology</span>
                                        <span className="font-black text-[10px] uppercase tracking-widest">Contexto de Ubicación</span>
                                    </div>
                                    <button onClick={() => setSelectedSup(null)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                                        <span className="material-symbols-outlined text-sm font-black">close</span>
                                    </button>
                                </div>

                                <div className="p-6">
                                    {!groundingData && !isAnalyzing && (
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-500 mb-6 uppercase leading-relaxed">Analice el entorno del supervisor usando datos de Google Maps</p>
                                            <button
                                                onClick={() => handleAnalyzeLocation(supervisors.find(s => s.id === selectedSup)!)}
                                                className="w-full py-3.5 bg-slate-900 dark:bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">explore</span>
                                                Iniciar Análisis
                                            </button>
                                        </div>
                                    )}

                                    {isAnalyzing && (
                                        <div className="py-8 flex flex-col items-center gap-4">
                                            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Sincronizando con Maps...</p>
                                        </div>
                                    )}

                                    {groundingData && (
                                        <div className="space-y-5 animate-in fade-in duration-500">
                                            <div>
                                                <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-1">{groundingData.place}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{groundingData.address}</p>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <div className="flex text-amber-500 text-[12px]">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <span key={i} className="material-symbols-outlined fill text-[16px]">star</span>
                                                    ))}
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">{groundingData.rating}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">({groundingData.userRatingsTotal} Reseñas)</span>
                                            </div>

                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-primary pl-4">
                                                {groundingData.snippet}
                                            </p>

                                            <a href={groundingData.uri} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition-all shadow-sm">
                                                VER EN GOOGLE MAPS
                                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default SupervisorTracking;