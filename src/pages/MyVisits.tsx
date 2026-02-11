import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../services/storage';
import { Visit, Client, User } from '../types';
import VisitPreviewModal from '../components/VisitPreviewModal';
import VisitActionModal from '../components/VisitActionModal';
import Sidebar from '../components/Sidebar';

const MyVisits = () => {
    const { user } = useAuth();
    const [allVisits, setAllVisits] = useState<Visit[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [supervisors, setSupervisors] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [filterSupervisor, setFilterSupervisor] = useState('');

    // Preview Modal State
    const [selectedPreviewVisit, setSelectedPreviewVisit] = useState<Visit | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Action Modal State
    const [selectedActionVisit, setSelectedActionVisit] = useState<Visit | null>(null);
    const [isActionOpen, setIsActionOpen] = useState(false);

    const loadData = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const loadedVisits = await StorageService.getVisits();
                // If Developer, show all. If Supervisor, show only assigned.
                const relevantVisits = user.role === 'developer'
                    ? loadedVisits
                    : loadedVisits.filter(v => v.supervisorId === user.id);

                setAllVisits(relevantVisits);
                setVisits(relevantVisits);

                const fetchedClients = await StorageService.getClients();
                setClients(fetchedClients);

                const users = await StorageService.getUsers();
                setSupervisors(users.filter(u => u.role === 'supervisor'));
            } catch (error) {
                console.error('Error loading visits data', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    // Apply Filters
    useEffect(() => {
        let filtered = allVisits;

        if (filterDate) {
            filtered = filtered.filter(v => v.date === filterDate);
        }

        if (filterClient) {
            filtered = filtered.filter(v => v.clientId === filterClient);
        }

        if (filterSupervisor) {
            filtered = filtered.filter(v => v.supervisorId === filterSupervisor);
        }

        setVisits(filtered);
    }, [filterDate, filterClient, filterSupervisor, allVisits]);

    const handleOpenPreview = async (visit: Visit) => {
        // Hydrate client data for preview
        const clientsData = await StorageService.getClients();
        const client = clientsData.find(c => c.id === visit.clientId);
        const hydratedVisit = {
            ...visit,
            clientPhotoUrl: client?.photoUrl,
            clientNit: client?.nit
        };
        setSelectedPreviewVisit(hydratedVisit);
        setIsPreviewOpen(true);
    };

    const handleOpenAction = (visit: Visit) => {
        setSelectedActionVisit(visit);
        setIsActionOpen(true);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
            case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
            case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'Completed': return 'Completada';
            case 'Pending': return 'Pendiente';
            case 'In Progress': return 'En Progreso';
            case 'Cancelled': return 'Cancelada';
            default: return status;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark relative">
                <header className="flex items-center justify-between px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 lg:hidden shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <Link to="/" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">Gestión Visitas</span>
                    </div>
                </header>
                <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
                    <div className="max-w-7xl mx-auto flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Link to="/" className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors mt-2">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </Link>
                                <div className="flex flex-col gap-1">
                                    <h1 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Listado de Visitas</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-base">Gestiona tus visitas programadas y revisa el estado de los informes legales.</p>
                                </div>
                            </div>
                            <Link to="/create-visit" className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-all w-full md:w-auto">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Registrar Visita</span>
                            </Link>
                        </div>

                        {/* Filters Bar */}
                        <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por Fecha</label>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={e => setFilterDate(e.target.value)}
                                    className="w-full md:w-40 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white"
                                />
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por Cliente</label>
                                <select
                                    value={filterClient}
                                    onChange={e => setFilterClient(e.target.value)}
                                    className="w-full md:w-48 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white"
                                >
                                    <option value="">Todos los Clientes</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {user?.role === 'developer' && (
                                <div className="w-full md:w-auto">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Filtrar por Supervisor</label>
                                    <select
                                        value={filterSupervisor}
                                        onChange={e => setFilterSupervisor(e.target.value)}
                                        className="w-full md:w-48 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white"
                                    >
                                        <option value="">Todos los Supervisores</option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {(filterDate || filterClient || filterSupervisor) && (
                                <button
                                    onClick={() => { setFilterDate(''); setFilterClient(''); setFilterSupervisor(''); }}
                                    className="px-4 py-2 text-sm text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                >
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>

                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            {isLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Info</th>
                                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                                                <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {visits.length > 0 ? (
                                                visits.map((visit) => (
                                                    <tr key={visit.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{visit.date}</td>
                                                        <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                                                            {visit.clientName}
                                                            {/* Creator Indicator */}
                                                            {visit.createdBy !== user?.id && (
                                                                <span className="block text-[10px] text-primary font-normal mt-0.5">
                                                                    Asignada por: {visit.creatorName}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">
                                                            <div className="flex flex-col">
                                                                <span>{visit.type}</span>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{visit.supervisorName.split(' ')[0]}</span>
                                                                    {visit.notes && (
                                                                        <button
                                                                            onClick={() => handleOpenPreview(visit)}
                                                                            className="text-amber-500 hover:text-amber-600"
                                                                            title="Ver Notas"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">description</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(visit.status)}`}>
                                                                {getStatusLabel(visit.status)}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 text-right flex justify-end gap-2">
                                                            {/* Preview Button (Always visible for quick access) */}
                                                            <button
                                                                onClick={() => handleOpenPreview(visit)}
                                                                className="inline-flex items-center justify-center size-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                                                                title="Vista Previa"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                            </button>

                                                            {visit.status === 'Completed' ? (
                                                                <Link to={`/visit-details/${visit.id}`} className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                                                                    Ver Informe
                                                                </Link>
                                                            ) : visit.status === 'Cancelled' ? (
                                                                <button disabled className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm font-medium cursor-not-allowed">
                                                                    Cancelada
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenAction(visit)}
                                                                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors gap-1"
                                                                >
                                                                    Gestionar
                                                                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                                        No se encontraron visitas con los filtros seleccionados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <VisitPreviewModal
                    visit={selectedPreviewVisit}
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                />

                <VisitActionModal
                    visit={selectedActionVisit}
                    isOpen={isActionOpen}
                    onClose={() => setIsActionOpen(false)}
                    onUpdate={loadData}
                />
            </main>
        </div>
    );
};

export default MyVisits;