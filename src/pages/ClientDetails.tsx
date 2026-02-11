import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Client, Visit, InventoryItem, AssignmentDetails } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface InventoryHistoryItem extends AssignmentDetails {
    itemName: string;
    serial: string;
    isCurrent: boolean;
}

const ClientDetails = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [client, setClient] = useState<Client | null>(null);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [inventoryHistory, setInventoryHistory] = useState<InventoryHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Client | null>(null);

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        if (!clientId) return;
        setIsLoading(true);
        try {
            const [allClients, allVisits, allInventory] = await Promise.all([
                StorageService.getClients(),
                StorageService.getVisits(),
                StorageService.getInventory()
            ]);

            const foundClient = allClients.find(c => c.id === clientId);
            setClient(foundClient || null);
            setEditForm(foundClient || null);

            const clientVisits = allVisits.filter(v => v.clientId === clientId);
            setVisits(clientVisits);

            // Calculate Inventory History for this client
            const history: InventoryHistoryItem[] = [];

            allInventory.forEach(item => {
                // Check past history
                if (item.history) {
                    item.history.forEach(record => {
                        // Match by ID (preferred) or Name (legacy backup)
                        if (record.clientId === clientId || (foundClient && record.post === foundClient.name)) {
                            history.push({
                                ...record,
                                itemName: item.name,
                                serial: item.serialNumber,
                                isCurrent: false
                            });
                        }
                    });
                }
                // Check current active assignment
                if (item.status === 'Asignado' && item.assignment) {
                    if (item.assignment.clientId === clientId || (foundClient && item.assignment.post === foundClient.name)) {
                        history.push({
                            ...item.assignment,
                            itemName: item.name,
                            serial: item.serialNumber,
                            isCurrent: true
                        });
                    }
                }
            });

            // Sort by date descending (newest first)
            history.sort((a, b) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateB.getTime() - dateA.getTime();
            });

            setInventoryHistory(history);
        } catch (error) {
            console.error('Error loading client details', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            loadData();
        }
    }, [clientId]);

    const parseDate = (dateStr: string) => {
        // Handle DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date();
    };

    const calculateDuration = (startStr: string, endStr?: string) => {
        if (!endStr) return 'En curso';
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} días`;
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editForm) {
            try {
                await StorageService.updateClient(editForm);
                setClient(editForm);
                setIsEditModalOpen(false);
                await loadData();
            } catch (error) {
                console.error('Error updating client', error);
                alert('Error al actualizar el cliente.');
            }
        }
    };

    const handleDeleteClient = async () => {
        if (confirm('¿Estás seguro de eliminar este cliente? Se borrará de la base de datos.')) {
            if (client) {
                try {
                    await StorageService.deleteClient(client.id);
                    navigate('/clients');
                } catch (error) {
                    console.error('Error deleting client', error);
                    alert('Error al eliminar cliente.');
                }
            }
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && client) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const newPhotoUrl = reader.result as string;
                const updatedClient = { ...client, photoUrl: newPhotoUrl };
                try {
                    await StorageService.updateClient(updatedClient);
                    setClient(updatedClient);
                    setEditForm(updatedClient);
                } catch (error) {
                    console.error('Error uploading photo', error);
                    alert('Error al subir la foto.');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const downloadInventoryCSV = () => {
        if (inventoryHistory.length === 0) return;

        const headers = ['Equipo', 'Serial', 'Estado', 'Fecha Entrega', 'Fecha Devolución', 'Días', 'Supervisor (Entrega)', 'Operario (Recibe)', 'Observaciones'];
        const rows = inventoryHistory.map(h => [
            h.itemName,
            h.serial,
            h.isCurrent ? 'ACTIVO' : 'DEVUELTO',
            h.date,
            h.endDate || '-',
            calculateDuration(h.date, h.endDate),
            h.supervisorName,
            h.operatorName,
            h.observations || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `historial_equipos_${client?.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-background-light dark:bg-background-dark">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-8 text-center text-slate-500 bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">error</span>
                <p className="text-xl font-bold">Cliente no encontrado...</p>
                <Link to="/clients" className="mt-4 text-primary hover:underline">Volver al listado</Link>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-10 py-3 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/clients" className="flex items-center gap-2 text-primary hover:text-primary-dark font-bold transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Volver
                    </Link>
                </div>
                <h2 className="text-slate-900 dark:text-white text-lg font-bold">Detalle Cliente</h2>
                <div className="w-10"></div>
            </header>

            <div className="px-4 sm:px-10 lg:px-40 flex flex-1 justify-center py-8">
                <div className="flex flex-col w-full max-w-7xl mx-auto flex-1 gap-6">
                    {/* Header Card */}
                    <div className="flex flex-wrap justify-between items-start gap-4 p-6 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="flex items-start gap-6">
                            <div className={`relative ${user?.role === 'developer' ? 'group cursor-pointer' : ''}`} onClick={user?.role === 'developer' ? triggerFileInput : undefined}>
                                {client.photoUrl ? (
                                    <img src={client.photoUrl} alt={client.name} className="size-24 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                                ) : (
                                    <div className={`size-24 rounded-lg flex items-center justify-center font-bold text-4xl border ${client.colorClass}`}>
                                        {client.initials}
                                    </div>
                                )}
                                {user?.role === 'developer' && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white">photo_camera</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            </div>

                            <div className="flex min-w-72 flex-col gap-2">
                                <h1 className="text-3xl md:text-4xl font-black leading-tight text-slate-900 dark:text-white">{client.name}</h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${client.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                        client.status === 'Retirado' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                            client.status === 'Pendiente' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                                                'bg-slate-100 text-slate-500'
                                        }`}>{client.status === 'Active' ? 'Activo' : client.status}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">Cliente ID: #{client.id}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">• NIT: {client.nit || 'N/A'}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">person</span>
                                        {client.contactName}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">mail</span>
                                        {client.email}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                        {client.phone}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                                        {client.address}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Link to="/create-visit" className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary hover:bg-primary-dark transition-colors text-white text-sm font-bold shadow-md shadow-blue-500/20">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span className="hidden sm:inline">Nueva Visita</span>
                            </Link>
                            {user?.role === 'developer' && (
                                <>
                                    <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-white text-sm font-bold">
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                        <span>Editar Info</span>
                                    </button>
                                    <button onClick={handleDeleteClient} className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors text-red-600 dark:text-red-400 text-sm font-bold">
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                        <span>Eliminar</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex justify-between items-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Visitas</p>
                                <span className="material-symbols-outlined text-primary text-xl">history</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{visits.length}</p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex justify-between items-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Última Visita</p>
                                <span className="material-symbols-outlined text-green-600 text-xl">event_available</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {visits.length > 0 ? visits[0].date : '-'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex justify-between items-center">
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ubicación</p>
                                <span className="material-symbols-outlined text-orange-500 text-xl">map</span>
                            </div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={client.address}>{client.address || 'Sin registrar'}</p>
                        </div>
                    </div>

                    {/* Inventory History Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                                Historial de Equipos Asignados
                            </h3>
                            {inventoryHistory.length > 0 && (
                                <button
                                    onClick={downloadInventoryCSV}
                                    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    CSV
                                </button>
                            )}
                        </div>

                        <div className="relative overflow-x-auto rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm max-h-[400px]">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark sticky top-0 font-bold z-10">
                                    <tr>
                                        <th className="px-4 py-3">Equipo</th>
                                        <th className="px-4 py-3">Serial</th>
                                        <th className="px-4 py-3">Fecha Inicio</th>
                                        <th className="px-4 py-3">Fecha Fin</th>
                                        <th className="px-4 py-3">Días</th>
                                        <th className="px-4 py-3">Entregó (Sup)</th>
                                        <th className="px-4 py-3">Recibió (Op)</th>
                                        <th className="px-4 py-3">Obs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryHistory.length > 0 ? (
                                        inventoryHistory.map((item, idx) => (
                                            <tr key={idx} className={`border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.isCurrent ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                    {item.itemName}
                                                    {item.isCurrent && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">ACTIVO</span>}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">{item.serial}</td>
                                                <td className="px-4 py-3">{item.date}</td>
                                                <td className="px-4 py-3">{item.endDate || '-'}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{calculateDuration(item.date, item.endDate)}</td>
                                                <td className="px-4 py-3">{item.supervisorName}</td>
                                                <td className="px-4 py-3">{item.operatorName}</td>
                                                <td className="px-4 py-3 italic max-w-[150px] truncate" title={item.observations}>{item.observations || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center italic">No hay historial de equipos asignados a este cliente.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Visits History */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Historial de Visitas</h3>
                        <div className="relative overflow-x-auto rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 border-b border-border-light dark:border-border-dark font-bold">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3">Supervisor</th>
                                        <th className="px-6 py-3">Estado</th>
                                        <th className="px-6 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visits.length > 0 ? (
                                        visits.map(visit => (
                                            <tr key={visit.id} className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{visit.date}</td>
                                                <td className="px-6 py-4">{visit.type}</td>
                                                <td className="px-6 py-4">{visit.supervisorName}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${visit.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                        visit.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                        {visit.status === 'Completed' ? 'Completada' : visit.status === 'Pending' ? 'Pendiente' : visit.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link to={`/visit-details/${visit.id}`} className="font-medium text-primary hover:underline">Ver Detalle</Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center italic">No hay visitas registradas para este cliente.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark rounded-xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Editar Información del Cliente</h3>
                        <form onSubmit={handleUpdateClient} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Nombre Empresa</label>
                                    <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">NIT / RUC</label>
                                    <input required value={editForm.nit} onChange={e => setEditForm({ ...editForm, nit: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Estado</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    >
                                        <option value="Active">Activo</option>
                                        <option value="Inactive">Inactivo</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Retirado">Retirado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Contacto Principal</label>
                                    <input required value={editForm.contactName} onChange={e => setEditForm({ ...editForm, contactName: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Email</label>
                                    <input required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Teléfono</label>
                                    <input required value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 font-bold">Dirección</label>
                                    <input required value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientDetails;