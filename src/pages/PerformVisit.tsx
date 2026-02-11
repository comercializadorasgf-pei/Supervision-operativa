import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { Visit, Observation } from '../types';

const PerformVisit = () => {
    const { visitId } = useParams();
    const navigate = useNavigate();
    const [visit, setVisit] = useState<Visit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [summary, setSummary] = useState('');
    const [observations, setObservations] = useState<Observation[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);

    // New Observation State
    const [newObs, setNewObs] = useState({ title: '', severity: 'Low' as const, description: '' });

    useEffect(() => {
        const loadVisit = async () => {
            if (visitId) {
                setIsLoading(true);
                try {
                    const data = await StorageService.getVisitById(visitId);
                    if (data) {
                        setVisit(data);
                        // Pre-fill if editing (though usually empty for new start)
                        if (data.interviewSummary) setSummary(data.interviewSummary);
                        if (data.observations) setObservations(data.observations);
                        if (data.photos) setPhotos(data.photos);
                    }
                } catch (error) {
                    console.error('Error loading visit', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadVisit();
    }, [visitId]);

    const handleAddObservation = () => {
        if (!newObs.title || !newObs.description) return;
        const obs: Observation = {
            id: Date.now().toString(),
            ...newObs
        };
        setObservations([...observations, obs]);
        setNewObs({ title: '', severity: 'Low', description: '' });
    };

    const handleRemoveObservation = (id: string) => {
        setObservations(prev => prev.filter(o => o.id !== id));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotos(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const handleSubmit = async () => {
        if (!visit) return;
        setIsSubmitting(true);

        try {
            const now = new Date();
            const updatedVisit: Visit = {
                ...visit,
                status: 'Completed',
                hasReport: true,
                interviewSummary: summary,
                observations: observations,
                photos: photos,
                completedDate: now.toISOString().split('T')[0],
                completedAt: now.toISOString() // Stores date and time with seconds
            };

            await StorageService.updateVisit(updatedVisit);
            navigate('/visit-details/' + visit.id); // Go to details to see result
        } catch (error) {
            console.error('Error completing visit', error);
            alert('Error al finalizar la visita. Por favor intente de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-background-light dark:bg-background-dark">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!visit) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-8 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Visita no encontrada</p>
            <Link to="/my-visits" className="text-primary hover:underline">Volver a mis visitas</Link>
        </div>
    );

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <Link to="/my-visits" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Realizar Visita</h1>
                                <p className="text-slate-500 text-sm">Cliente: {visit.clientName}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined">check_circle</span>
                            )}
                            {isSubmitting ? 'Guardando...' : 'Finalizar Visita'}
                        </button>
                    </header>

                    <div className="space-y-6">
                        {/* Section 1: Summary */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">assignment</span>
                                Resumen de la Entrevista / Visita
                            </h3>
                            <textarea
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                className="w-full h-32 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none font-sans"
                                placeholder="Describa los puntos principales tratados durante la visita..."
                            ></textarea>
                        </div>

                        {/* Section 2: Observations */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">warning</span>
                                Observaciones Críticas
                            </h3>

                            {/* Add Form */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg mb-6 border border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                    <div className="md:col-span-2">
                                        <input
                                            placeholder="Título de la observación (ej. Extintor Vencido)"
                                            value={newObs.title}
                                            onChange={e => setNewObs({ ...newObs, title: e.target.value })}
                                            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={newObs.severity}
                                            onChange={e => setNewObs({ ...newObs, severity: e.target.value as any })}
                                            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm"
                                        >
                                            <option value="Low">Baja Prioridad</option>
                                            <option value="Medium">Media Prioridad</option>
                                            <option value="High">Alta Prioridad</option>
                                        </select>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Descripción detallada del hallazgo..."
                                    value={newObs.description}
                                    onChange={e => setNewObs({ ...newObs, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white text-sm mb-3 h-20"
                                ></textarea>
                                <div className="flex justify-end">
                                    <button onClick={handleAddObservation} className="px-4 py-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                                        Agregar Observación
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="space-y-3">
                                {observations.length === 0 && <p className="text-center text-slate-400 text-sm italic py-4">No hay observaciones registradas.</p>}
                                {observations.map(obs => (
                                    <div key={obs.id} className="flex items-start gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 relative group transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                        <button onClick={() => handleRemoveObservation(obs.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                        <div className={`p-2 rounded-lg shrink-0 ${obs.severity === 'High' ? 'bg-red-100 text-red-600' :
                                                obs.severity === 'Medium' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            <span className="material-symbols-outlined">
                                                {obs.severity === 'High' ? 'error' : obs.severity === 'Medium' ? 'warning' : 'info'}
                                            </span>
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{obs.title}</h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${obs.severity === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                        obs.severity === 'Medium' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                            'bg-blue-50 text-blue-700 border border-blue-100'
                                                    }`}>
                                                    {obs.severity === 'High' ? 'Alta' : obs.severity === 'Medium' ? 'Media' : 'Baja'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 group-hover:line-clamp-none transition-all">{obs.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Photos */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">photo_camera</span>
                                Evidencia Fotográfica
                            </h3>

                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {photos.map((photo, idx) => (
                                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative group shadow-sm">
                                        <img src={photo} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => setPhotos(photos.filter((_, i) => i !== idx))} className="bg-white text-red-600 rounded-full p-2 hover:bg-red-50 transition-colors shadow-lg">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary transition-all group"
                                >
                                    <span className="material-symbols-outlined text-3xl mb-1 group-hover:text-primary transition-colors">add_a_photo</span>
                                    <span className="text-xs font-bold group-hover:text-primary transition-colors">Agregar Foto</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 italic">Se recomienda subir fotos claras de los hallazgos y del entorno visitado.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PerformVisit;