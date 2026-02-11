import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { StorageService } from '../services/storage';
import { Visit, Client, User, InventoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import VisitPreviewModal from '../components/VisitPreviewModal';
import VisitActionModal from '../components/VisitActionModal';

interface ChartData {
    day: string;
    val: number;
}

const Dashboard = () => {
    const { user } = useAuth();
    const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
    const [stats, setStats] = useState({
        visitsCount: 0,
        pendingVisitsCount: 0,
        clientsCount: 0,
        newClientsThisMonth: 0,
        supervisorsCount: 0,
        visitGrowth: 0,
        inventoryStats: {
            total: 0,
            disponible: 0,
            asignado: 0,
            taller: 0,
            inactivo: 0
        }
    });

    // Chart State
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [supervisors, setSupervisors] = useState<User[]>([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // Sidebar state
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Preview Modal State
    const [selectedPreviewVisit, setSelectedPreviewVisit] = useState<Visit | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Action Modal State
    const [selectedActionVisit, setSelectedActionVisit] = useState<Visit | null>(null);
    const [isActionOpen, setIsActionOpen] = useState(false);

    const loadData = async () => {
        const visits = await StorageService.getVisits();
        const clients = await StorageService.getClients();
        const users = await StorageService.getUsers();
        const inventory = await StorageService.getInventory();
        const sups = users.filter(u => u.role === 'supervisor');

        setRecentVisits(visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
        setSupervisors(sups);

        // Date calculations
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const visitsThisMonth = visits.filter(v => new Date(v.date) >= firstDayThisMonth).length;
        const visitsLastMonth = visits.filter(v => {
            const d = new Date(v.date);
            return d >= firstDayLastMonth && d < firstDayThisMonth;
        }).length;

        const growth = visitsLastMonth === 0 ? 0 : Math.round(((visitsThisMonth - visitsLastMonth) / visitsLastMonth) * 100);
        const newClients = clients.filter(c => {
            // Fallback if client doesn't have a creation date, though Client type doesn't explicitly store it
            // For now, let's assume all without lastVisitDate might be "new" or just count 0 for safety
            return false; // To be improved if types update
        }).length;

        const invStats = {
            total: inventory.length,
            disponible: inventory.filter(i => i.status === 'Disponible').length,
            asignado: inventory.filter(i => i.status === 'Asignado').length,
            taller: inventory.filter(i => i.status === 'En Taller').length,
            inactivo: inventory.filter(i => i.status === 'Inactivo').length
        };

        setStats({
            visitsCount: visits.length,
            pendingVisitsCount: visits.filter(v => v.status === 'Pending' || v.status === 'In Progress').length,
            clientsCount: clients.length,
            newClientsThisMonth: clients.filter(c => {
                if (!c.created_at) return false;
                const createdDate = new Date(c.created_at);
                const now = new Date();
                return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
            }).length,
            supervisorsCount: sups.length,
            visitGrowth: growth,
            inventoryStats: invStats
        });

        processChartData(visits, selectedSupervisorId);
    };

    useEffect(() => {
        loadData();
    }, [selectedSupervisorId]); // Re-run when supervisor filter changes

    const processChartData = (visits: Visit[], supervisorId: string | null) => {
        // Filter visits if supervisor selected
        let relevantVisits = visits;
        if (supervisorId) {
            relevantVisits = visits.filter(v => v.supervisorId === supervisorId);
        }

        // Generate last 7 days keys
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dataMap: { [key: string]: number } = {};
        const today = new Date();

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            dataMap[dateKey] = 0;
        }

        // Count visits
        relevantVisits.forEach(v => {
            if (dataMap.hasOwnProperty(v.date)) {
                dataMap[v.date]++;
            }
        });

        // Map back to result array preserving order
        const finalData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            const dayName = days[d.getDay()];
            finalData.push({ day: dayName, val: dataMap[dateKey] || 0 });
        }

        setChartData(finalData);
    };

    const handleOpenPreview = async (visit: Visit) => {
        // Hydrate client data
        const clients = await StorageService.getClients();
        const client = clients.find(c => c.id === visit.clientId);
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
            case 'Completed': return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'Pending': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
            case 'In Progress': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
            case 'Cancelled': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
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
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative transition-all duration-300">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="text-[#0d141b] dark:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <span className="font-bold text-lg text-slate-900 dark:text-white">Panel Operativo</span>
                    </div>
                    <img
                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`}
                        className="rounded-full size-8 object-cover border border-slate-200 dark:border-slate-700"
                        alt="Profile"
                    />
                </div>

                <div className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-10">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-[#0d141b] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">Dashboard General</h1>
                            <p className="text-[#4c739a] dark:text-slate-400 text-base font-normal">Resumen de operaciones y estado de informes legales</p>
                        </div>
                        <Link to="/create-visit" className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm hover:shadow transition-all w-full md:w-auto">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Nueva Visita</span>
                        </Link>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <div className="flex flex-col gap-2 rounded-xl bg-surface-light dark:bg-surface-dark p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium">Visitas Realizadas</p>
                                <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg text-[20px]">check_circle</span>
                            </div>
                            <p className="text-[#0d141b] dark:text-white text-3xl font-bold mt-1">{stats.visitsCount}</p>
                            <p className={`${stats.visitGrowth >= 0 ? 'text-[#078838] dark:text-green-400' : 'text-red-500'} text-xs font-medium flex items-center gap-1`}>
                                <span className="material-symbols-outlined text-[16px]">{stats.visitGrowth >= 0 ? 'trending_up' : 'trending_down'}</span>
                                {stats.visitGrowth >= 0 ? '+' : ''}{stats.visitGrowth}% vs mes anterior
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl bg-surface-light dark:bg-surface-dark p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium">Faltantes por Reportar</p>
                                <span className="material-symbols-outlined text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded-lg text-[20px]">pending_actions</span>
                            </div>
                            <p className="text-[#0d141b] dark:text-white text-3xl font-bold mt-1">{stats.pendingVisitsCount}</p>
                            <p className="text-orange-600 dark:text-orange-400 text-xs font-medium">Informes no finalizados</p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl bg-surface-light dark:bg-surface-dark p-6 border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium">Plantilla Supervisión</p>
                                <span className="material-symbols-outlined text-purple-500 bg-purple-50 dark:bg-purple-900/20 p-1.5 rounded-lg text-[20px]">badge</span>
                            </div>
                            <p className="text-[#0d141b] dark:text-white text-3xl font-bold mt-1">{stats.supervisorsCount}</p>
                            <p className="text-[#4c739a] dark:text-slate-400 text-xs font-medium">Personal registrado</p>
                        </div>
                        <Link to="/clients" className="flex flex-col gap-2 rounded-xl bg-surface-light dark:bg-surface-dark p-6 border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center justify-between">
                                <p className="text-[#4c739a] dark:text-slate-400 text-sm font-medium">Clientes Activos</p>
                                <span className="material-symbols-outlined text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg text-[20px]">storefront</span>
                            </div>
                            <p className="text-[#0d141b] dark:text-white text-3xl font-bold mt-1">{stats.clientsCount}</p>
                            <p className="text-[#078838] dark:text-green-400 text-xs font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">verified</span>
                                Cobertura completa
                            </p>
                        </Link>
                    </div>

                    {/* Charts & Actions */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                        {/* Chart */}
                        <div className="xl:col-span-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-6 relative">
                                <div>
                                    <h3 className="text-[#0d141b] dark:text-white text-lg font-bold">Actividad de Supervisión</h3>
                                    <p className="text-[#4c739a] dark:text-slate-400 text-sm">
                                        {selectedSupervisorId
                                            ? `Filtrado por: ${supervisors.find(s => s.id === selectedSupervisorId)?.name}`
                                            : 'Visitas completadas últimos 7 días'}
                                    </p>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                        className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors"
                                    >
                                        <span className="material-symbols-outlined">more_horiz</span>
                                    </button>

                                    {/* Supervisor Filter Menu */}
                                    {isFilterMenuOpen && (
                                        <div className="absolute right-0 top-10 w-56 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-xs font-bold text-slate-500 uppercase">Filtrar por Supervisor</p>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                <button
                                                    onClick={() => { setSelectedSupervisorId(null); setIsFilterMenuOpen(false); }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center ${!selectedSupervisorId ? 'text-primary font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    Todos
                                                    {!selectedSupervisorId && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                </button>
                                                {supervisors.map(sup => (
                                                    <button
                                                        key={sup.id}
                                                        onClick={() => { setSelectedSupervisorId(sup.id); setIsFilterMenuOpen(false); }}
                                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center ${selectedSupervisorId === sup.id ? 'text-primary font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                                    >
                                                        {sup.name}
                                                        {selectedSupervisorId === sup.id && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 240 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                        />
                                        <Bar
                                            dataKey="val"
                                            fill="#137fec"
                                            radius={[4, 4, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Conditional Section: Quick Access (Developer) or Inventory Summary (Supervisor) */}
                        <div className="flex flex-col gap-4">
                            {user?.role === 'developer' ? (
                                <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5 shadow-sm h-full">
                                    <h3 className="text-[#0d141b] dark:text-white text-lg font-bold mb-4">Accesos Rápidos</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <Link to="/supervisors-manage" className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group text-left">
                                            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg text-primary">
                                                <span className="material-symbols-outlined">person_add</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-[#0d141b] dark:text-white group-hover:text-primary">Registrar Usuario</p>
                                                <p className="text-xs text-[#4c739a] dark:text-slate-400">Supervisores y Admins</p>
                                            </div>
                                        </Link>
                                        <Link to="/create-client" className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                                            <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg text-green-600">
                                                <span className="material-symbols-outlined">domain_add</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-sm text-[#0d141b] dark:text-white group-hover:text-primary">Nuevo Cliente</p>
                                                <p className="text-xs text--[#4c739a] dark:text-slate-400">Crear perfil de empresa</p>
                                            </div>
                                        </Link>
                                        <button className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group text-left">
                                            <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-lg text-orange-600">
                                                <span className="material-symbols-outlined">download</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-[#0d141b] dark:text-white group-hover:text-primary">Exportar Data</p>
                                                <p className="text-xs text-[#4c739a] dark:text-slate-400">Descargar CSV mensual</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-5 shadow-sm h-full">
                                    <h3 className="text-[#0d141b] dark:text-white text-lg font-bold mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">inventory_2</span>
                                        Estado de Equipos
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-blue-600"></div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Total en Inventario</span>
                                            </div>
                                            <span className="text-lg font-black text-blue-700 dark:text-blue-400">{stats.inventoryStats.total}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-green-500"></div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Equipos Operativos</span>
                                            </div>
                                            <span className="text-sm font-bold text-green-600 dark:text-green-400">{stats.inventoryStats.asignado}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Equipos Disponibles</span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.inventoryStats.disponible}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-orange-500"></div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">En Taller / Mantenimiento</span>
                                            </div>
                                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{stats.inventoryStats.taller}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="size-2 rounded-full bg-slate-400"></div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Inactivos</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{stats.inventoryStats.inactivo}</span>
                                        </div>
                                        <Link to="/inventory" className="mt-2 flex items-center justify-center gap-2 py-2 text-xs font-bold text-primary hover:underline transition-all">
                                            Ver inventario completo
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-[#0d141b] dark:text-white text-lg font-bold">Últimas Visitas Realizadas</h3>
                            <Link to="/my-visits" className="text-sm font-medium text-primary hover:text-blue-700">Ver todas</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 dark:bg-[#202b36] text-[#4c739a] dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Fecha</th>
                                        <th className="px-6 py-4 font-semibold">Cliente</th>
                                        <th className="px-6 py-4 font-semibold">Supervisor</th>
                                        <th className="px-6 py-4 font-semibold">Estado</th>
                                        <th className="px-6 py-4 font-semibold">Tipo</th>
                                        <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-light dark:divide-border-dark text-[#0d141b] dark:text-slate-200">
                                    {recentVisits.length > 0 ? (
                                        recentVisits.map(visit => (
                                            <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-500">{visit.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold">{visit.clientName}</span>
                                                </td>
                                                <td className="px-6 py-4 text-[#4c739a] dark:text-slate-400">{visit.supervisorName}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(visit.status)}`}>
                                                        {getStatusLabel(visit.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {visit.type}
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
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {/* Quick View Button */}
                                                    <button
                                                        onClick={() => handleOpenPreview(visit)}
                                                        className="text-[#4c739a] hover:text-primary mr-2"
                                                        title="Vista Rápida / Validar"
                                                    >
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </button>

                                                    {visit.status === 'Completed' || visit.status === 'Cancelled' ? (
                                                        <Link to={`/visit-details/${visit.id}`} className="text-[#4c739a] hover:text-primary">
                                                            <span className="material-symbols-outlined">navigate_next</span>
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenAction(visit)}
                                                            className="text-primary hover:text-blue-700"
                                                            title="Gestionar"
                                                        >
                                                            <span className="material-symbols-outlined">edit_square</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                                No hay visitas registradas aún.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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

export default Dashboard;