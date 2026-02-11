import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ClientsList = () => {
    const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState<'Todos' | 'Active' | 'Inactive'>('Todos');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [clientsData, setClientsData] = useState<Client[]>([]);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<string | null>(null);

    // File Input for CSV
    const csvInputRef = useRef<HTMLInputElement>(null);

    const loadClients = async () => {
        const data = await StorageService.getClients();
        setClientsData(data);
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setClientToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (clientToDelete) {
            await StorageService.deleteClient(clientToDelete);
            setClientsData(prev => prev.filter(c => c.id !== clientToDelete));
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
        }
    };

    const filteredClients = clientsData.filter(client =>
        filterStatus === 'Todos' ? true : client.status === filterStatus
    );

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleFilterChange = (status: 'Todos' | 'Active' | 'Inactive') => {
        setFilterStatus(status);
        setIsDropdownOpen(false);
    };

    // --- CSV Import Features ---
    const handleDownloadTemplate = () => {
        const headers = ["Razón social", "Nit", "Representante legal", "correo", "celular", "dirección", "URL logo"];
        const exampleRow = ["Ejemplo S.A.", "900.000.000-1", "Juan Perez", "contacto@ejemplo.com", "3001234567", "Calle 123 #45-67", "https://ejemplo.com/logo.png"];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + exampleRow.join(",");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_carga_clientes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cleanField = (str: string) => {
        if (!str) return '';
        return str.trim().replace(/^["']|["']$/g, '');
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            if (!text) return;

            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                alert('El archivo CSV está vacío o solo contiene la cabecera.');
                return;
            }

            const header = lines[0];
            const commaCount = (header.match(/,/g) || []).length;
            const semiCount = (header.match(/;/g) || []).length;
            const separator = semiCount > commaCount ? ';' : ',';

            const newClients: Partial<Client>[] = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(separator);
                if (cols.length >= 2 && cleanField(cols[0]) !== "") {
                    newClients.push({
                        name: cleanField(cols[0]),
                        nit: cleanField(cols[1]),
                        contactName: cleanField(cols[2]),
                        email: cleanField(cols[3]),
                        phone: cleanField(cols[4]),
                        address: cleanField(cols[5]),
                        photoUrl: cleanField(cols[6])
                    });
                }
            }

            if (newClients.length > 0) {
                const result = await StorageService.addClientsBulk(newClients);
                await loadClients(); // Refresh list

                let message = 'Proceso completado:\n';
                if (result.created > 0) message += `- ${result.created} clientes nuevos creados.\n`;
                if (result.updated > 0) message += `- ${result.updated} clientes existentes actualizados.`;
                if (result.created === 0 && result.updated === 0) message = 'No se realizaron cambios, los datos eran idénticos.';

                alert(message);
            } else {
                alert('No se encontraron registros válidos en el archivo CSV. Asegúrese de usar el formato de la plantilla.');
            }

            if (csvInputRef.current) csvInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-screen relative overflow-hidden bg-background-light dark:bg-background-dark">
                <header className="h-16 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark flex items-center justify-between px-4 lg:hidden shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <Link to="/" className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <span className="font-bold text-slate-900 dark:text-white text-lg">Clientes</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-6 md:px-10 md:py-10 max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <Link to="/" className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors mt-2">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </Link>
                                <div className="flex flex-col gap-2 max-w-2xl">
                                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Gestión de Clientes</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg">Administra la base de datos de clientes, contactos y revisa el historial de visitas operativas.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                {user?.role === 'developer' && (
                                    <>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            ref={csvInputRef}
                                            onChange={handleCSVUpload}
                                            className="hidden"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleDownloadTemplate} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap" title="Descargar ejemplo CSV">
                                                <span className="material-symbols-outlined text-[20px]">download</span>
                                                <span className="hidden sm:inline">Plantilla</span>
                                            </button>
                                            <button onClick={() => csvInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap shadow-lg shadow-green-600/20">
                                                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                                <span>Importar CSV</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                {user?.role === 'developer' && (
                                    <Link to="/create-client" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-lg shadow-primary/20 whitespace-nowrap">
                                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                        <span>Añadir Nuevo Cliente</span>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-slate-200 dark:border-border-dark flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                            <div className="w-full md:w-1/3 relative group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                </div>
                                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary block pl-11 p-3 placeholder-slate-400 transition-all outline-none" placeholder="Buscar por nombre, contacto o email..." type="text" />
                            </div>
                            <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                                <div className="flex items-center gap-2 relative">
                                    <button
                                        onClick={toggleDropdown}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg whitespace-nowrap shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                        {filterStatus === 'Todos' ? 'Todos los estados' : filterStatus}
                                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-border-dark z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => handleFilterChange('Todos')}
                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${filterStatus === 'Todos' ? 'text-primary font-semibold bg-primary/5' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    Todos
                                                    {filterStatus === 'Todos' && <span className="material-symbols-outlined text-[18px]">check</span>}
                                                </button>
                                                <button
                                                    onClick={() => handleFilterChange('Active')}
                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${filterStatus === 'Active' ? 'text-primary font-semibold bg-primary/5' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2 rounded-full bg-green-500"></div>
                                                        Active
                                                    </div>
                                                    {filterStatus === 'Active' && <span className="material-symbols-outlined text-[18px]">check</span>}
                                                </button>
                                                <button
                                                    onClick={() => handleFilterChange('Inactive')}
                                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${filterStatus === 'Inactive' ? 'text-primary font-semibold bg-primary/5' : 'text-slate-700 dark:text-slate-300'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2 rounded-full bg-slate-400"></div>
                                                        Inactive
                                                    </div>
                                                    {filterStatus === 'Inactive' && <span className="material-symbols-outlined text-[18px]">check</span>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-border-dark overflow-hidden flex flex-col min-h-[300px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-border-dark">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Empresa</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">NIT / RUC</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto / Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono / Dirección</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map((client) => (
                                                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            {client.photoUrl ? (
                                                                <img src={client.photoUrl} alt={client.name} className="size-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                                            ) : (
                                                                <div className={`size-12 rounded-lg flex items-center justify-center font-bold text-xl border ${client.colorClass}`}>
                                                                    {client.initials}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-slate-900 dark:text-white">{client.name}</p>
                                                                    <div
                                                                        className={`size-2.5 rounded-full ${client.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}
                                                                        title={client.status}
                                                                    ></div>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">ID: #{client.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{client.nit || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <p className="text-sm text-slate-900 dark:text-white font-medium">{client.contactName}</p>
                                                            <span className="text-xs text-slate-500">{client.email}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col max-w-[200px]">
                                                            <p className="text-sm text-slate-900 dark:text-white">{client.phone}</p>
                                                            <span className="text-xs text-slate-500 truncate" title={client.address}>{client.address}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${client.status === 'Active'
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                                            }`}>
                                                            {client.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link
                                                                to="/create-visit"
                                                                state={{ clientId: client.id, clientName: client.name }}
                                                                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                                                Visita
                                                            </Link>
                                                            <Link to={`/client-details/${client.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors mr-2">
                                                                Ver Historial
                                                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                            </Link>
                                                            {user?.role === 'developer' && (
                                                                <button onClick={(e) => handleDeleteClick(client.id, e)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar Cliente">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">search_off</span>
                                                        <p>No se encontraron clientes con el filtro seleccionado.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-surface-dark rounded-xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100 border border-slate-100 dark:border-slate-700">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                    <span className="material-symbols-outlined text-3xl">warning</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Confirmar Eliminación</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        ¿Estás seguro de que deseas eliminar este cliente? Se perderá todo el historial asociado y esta acción no se puede deshacer.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-red-500/20 text-sm"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClientsList;