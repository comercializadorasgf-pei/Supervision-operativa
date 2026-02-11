import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { Client } from '../types';

interface ClientWithCount extends Client {
    reportsCount: number;
}

const Reports = () => {
    const [clients, setClients] = useState<ClientWithCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const loadReportsData = async () => {
            setIsLoading(true);
            try {
                const loadedClients = await StorageService.getClients();
                // Fetch reports counts asynchronously
                const clientsWithData = await Promise.all(loadedClients.map(async (client) => {
                    const reports = await StorageService.getReports(client.id);
                    return {
                        ...client,
                        reportsCount: reports.length
                    };
                }));
                setClients(clientsWithData);
            } catch (error) {
                console.error('Error loading reports center data', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadReportsData();
    }, []);

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-20 shadow-sm font-bold">
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
                        <span className="font-extrabold text-lg text-slate-900 dark:text-white">Reportes</span>
                    </div>
                </header>

                <div className="flex flex-col w-full max-w-7xl mx-auto flex-1 gap-6">
                    <div className="flex items-center gap-4 mb-8">
                        <Link to="/" className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Centro de Reportes</h1>
                            <p className="text-slate-500 font-medium">Seleccione un cliente para ver sus informes operativos detallados.</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 opacity-50">
                            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold">Consolidando informes...</p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            {clients.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-surface-dark rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                                    <div className="size-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-symbols-outlined text-4xl text-slate-300">folder_off</span>
                                    </div>
                                    <p className="text-slate-900 dark:text-white font-black text-xl mb-2">Sin clientes registrados</p>
                                    <p className="text-slate-500 mb-6 px-4">No hay información de clientes para mostrar reportes en este momento.</p>
                                    <Link to="/create-client" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-black hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20">
                                        <span className="material-symbols-outlined">add</span>
                                        Registrar Nuevo Cliente
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {clients.map(client => (
                                        <Link
                                            to={`/reports/${client.id}`}
                                            key={client.id}
                                            className="group bg-white dark:bg-surface-dark p-8 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col justify-between h-56 relative overflow-hidden"
                                        >
                                            <div className={`absolute top-0 right-0 w-2.5 h-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'} transition-all group-hover:w-4`}></div>

                                            <div className="flex justify-between items-start mb-4">
                                                {client.photoUrl ? (
                                                    <img src={client.photoUrl} alt={client.name} className="size-14 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <div className={`size-14 rounded-xl ${client.colorClass || 'bg-primary/10 text-primary'} flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm transition-transform group-hover:rotate-6`}>
                                                        <span className="font-black text-2xl tracking-tighter">{client.initials}</span>
                                                    </div>
                                                )}

                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                    ID: {client.id.slice(0, 8)}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <h3 className="font-black text-xl text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate leading-tight">
                                                    {client.name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold">
                                                    <span className="material-symbols-outlined text-[18px] text-primary group-hover:animate-bounce">description</span>
                                                    <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                        {client.reportsCount} {client.reportsCount === 1 ? 'informe disponible' : 'informes disponibles'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-wider opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
                                                <span>Ver Detalle</span>
                                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Reports;