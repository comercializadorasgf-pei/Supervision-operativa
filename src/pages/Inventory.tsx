import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { InventoryItem, InventoryStatus, AssignmentDetails, MaintenanceRecord, StatusLog, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Inventory = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const maintFileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [newItem, setNewItem] = useState({ name: '', description: '', serialNumber: '', imageUrl: '' });
    const [assignData, setAssignData] = useState({ clientId: '', post: '', operatorName: '', observations: '', evidenceUrl: '' });
    const [maintData, setMaintData] = useState({
        date: new Date().toISOString().slice(0, 16),
        workshopName: '',
        receiverName: '',
        reason: '',
        observations: '',
        photoUrl: ''
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedClients] = await Promise.all([
                StorageService.getInventory(),
                StorageService.getClients()
            ]);
            setItems(fetchedItems);
            setClients(fetchedClients);
        } catch (error) {
            console.error('Error loading inventory data', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await StorageService.addInventoryItem({
                id: Date.now().toString(),
                status: 'Disponible',
                ...newItem,
                imageUrl: newItem.imageUrl || 'https://images.unsplash.com/photo-1558227691-41ea7821f632?auto=format&fit=crop&q=80&w=300',
                history: [],
                maintenanceLog: [],
                statusLogs: [
                    {
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        previousStatus: 'Disponible',
                        newStatus: 'Disponible',
                        changedBy: user?.name || 'Sistema',
                        reason: 'Ingreso inicial al inventario'
                    }
                ]
            });
            setIsAddModalOpen(false);
            setNewItem({ name: '', description: '', serialNumber: '', imageUrl: '' });
            await loadData();
        } catch (error) {
            console.error('Error adding item', error);
            alert('Error al agregar equipo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any>>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter((prev: any) => ({ ...prev, [fieldName]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('¿Eliminar este equipo del inventario de forma permanente?')) return;

        setIsSubmitting(true);
        try {
            await StorageService.deleteInventoryItem(itemId);
            await loadData();
            setIsDetailsModalOpen(false);
        } catch (error) {
            console.error('Error deleting item', error);
            alert('Error al eliminar equipo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignStart = (item: InventoryItem) => {
        setSelectedItem(item);
        setAssignData({ clientId: '', post: '', operatorName: '', observations: '', evidenceUrl: '' });
        setIsAssignModalOpen(true);
    };

    const handleMaintenanceStart = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsMaintenanceModalOpen(true);
    };

    const handleViewDetails = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsDetailsModalOpen(true);
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedClientId = e.target.value;
        const selectedClient = clients.find(c => c.id === selectedClientId);
        if (selectedClient) {
            setAssignData({
                ...assignData,
                clientId: selectedClient.id,
                post: selectedClient.name
            });
        } else {
            setAssignData({ ...assignData, clientId: '', post: '' });
        }
    };

    const handleAssignComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !user) return;
        setIsSubmitting(true);

        const updatedHistory = [...(selectedItem.history || [])];
        if (updatedHistory.length > 0 && !updatedHistory[0].endDate) {
            updatedHistory[0] = {
                ...updatedHistory[0],
                endDate: new Date().toLocaleDateString()
            };
        }

        const assignment: AssignmentDetails = {
            clientId: assignData.clientId,
            post: assignData.post,
            operatorName: assignData.operatorName,
            supervisorName: user.name,
            date: new Date().toLocaleDateString(),
            supervisorSignature: 'SIGNED_BY_' + user.name,
            operatorSignature: 'SIGNED_BY_' + assignData.operatorName,
            observations: assignData.observations,
            evidenceUrl: assignData.evidenceUrl
        };

        const newLog: StatusLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            previousStatus: selectedItem.status,
            newStatus: 'Asignado',
            changedBy: user.name,
            reason: `Asignación: ${assignData.operatorName} en ${assignData.post}`
        };

        const updatedItem: InventoryItem = {
            ...selectedItem,
            status: 'Asignado',
            assignment,
            history: [assignment, ...updatedHistory],
            statusLogs: [newLog, ...(selectedItem.statusLogs || [])]
        };

        try {
            await StorageService.updateInventoryItem(updatedItem);
            setIsAssignModalOpen(false);
            setAssignData({ clientId: '', post: '', operatorName: '', observations: '' });
            setSelectedItem(null);
            await loadData();
        } catch (error) {
            console.error('Error assigning item', error);
            alert('Error al asignar equipo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMaintenanceComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !user) return;
        setIsSubmitting(true);

        const record: MaintenanceRecord = {
            id: Date.now().toString(),
            ...maintData
        };

        const newLog: StatusLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            previousStatus: selectedItem.status,
            newStatus: 'En Taller',
            changedBy: user.name,
            reason: `Taller: ${maintData.reason} (${maintData.workshopName})`
        };

        const updatedItem: InventoryItem = {
            ...selectedItem,
            status: 'En Taller',
            assignment: undefined,
            maintenanceLog: [record, ...(selectedItem.maintenanceLog || [])],
            statusLogs: [newLog, ...(selectedItem.statusLogs || [])]
        };

        try {
            await StorageService.updateInventoryItem(updatedItem);
            setIsMaintenanceModalOpen(false);
            setMaintData({ date: new Date().toISOString().slice(0, 16), workshopName: '', receiverName: '', reason: '', observations: '', photoUrl: '' });
            setSelectedItem(null);
            await loadData();
        } catch (error) {
            console.error('Error sending to maintenance', error);
            alert('Error al enviar a taller.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangeStatus = async (item: InventoryItem, newStatus: InventoryStatus) => {
        if (newStatus === 'Asignado') return handleAssignStart(item);
        if (newStatus === 'En Taller') return handleMaintenanceStart(item);
        if (newStatus === 'Inactivo' && user?.role !== 'developer') return;
        if (item.status === newStatus) return;

        setIsLoading(true);
        const reason = newStatus === 'Disponible' ? 'Liberación de equipo / Retorno a inventario' : 'Baja administrativa';

        const newLog: StatusLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            previousStatus: item.status,
            newStatus: newStatus,
            changedBy: user?.name || 'Sistema',
            reason: reason
        };

        let updatedHistory = [...(item.history || [])];
        if (item.status === 'Asignado' && updatedHistory.length > 0 && !updatedHistory[0].endDate) {
            updatedHistory[0] = {
                ...updatedHistory[0],
                endDate: new Date().toLocaleDateString()
            };
        }

        const updatedItem: InventoryItem = {
            ...item,
            status: newStatus,
            assignment: undefined,
            history: updatedHistory,
            statusLogs: [newLog, ...(item.statusLogs || [])]
        };

        try {
            await StorageService.updateInventoryItem(updatedItem);
            await loadData();
        } catch (error) {
            console.error('Error changing status', error);
            alert('Error al cambiar estado.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ["Nombre del equipo", "Marca", "Descripción", "Serie", "URL Foto"];
        const exampleRow = ["Pulidora Industrial", "Makita", "9 pulgadas, 2200W", "MK-99827", "https://ejemplo.com/herramienta.jpg"];
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + exampleRow.join(",");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_carga_equipos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            if (!text) {
                setIsLoading(false);
                return;
            }

            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) {
                alert('Archivo vacío.');
                setIsLoading(false);
                return;
            }

            const separator = lines[0].includes(';') ? ';' : ',';
            const newItems: Partial<InventoryItem>[] = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
                if (cols[0]) {
                    newItems.push({
                        name: cols[0],
                        description: cols[1] && cols[2] ? `${cols[1]} - ${cols[2]}` : (cols[1] || cols[2] || ''),
                        serialNumber: cols[3] || `SN-MOCK-${Date.now()}-${i}`,
                        imageUrl: cols[4] || 'https://images.unsplash.com/photo-1558227691-41ea7821f632?auto=format&fit=crop&q=80&w=300'
                    });
                }
            }

            if (newItems.length > 0) {
                try {
                    const result = await StorageService.addInventoryBulk(newItems);
                    await loadData();
                    alert(`Importación finalizada.\nCreados: ${result.created}\nOmitidos (Duplicados): ${result.skipped}`);
                } catch (error) {
                    console.error('Bulk upload error', error);
                    alert('Error en la carga masiva.');
                    setIsLoading(false);
                }
            } else {
                alert('No se encontraron registros válidos.');
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const getStatusStyles = (status: InventoryStatus) => {
        switch (status) {
            case 'Disponible': return 'bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
            case 'Asignado': return 'bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
            case 'En Taller': return 'bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
            case 'Inactivo': return 'bg-slate-100/50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30';
            default: return 'bg-slate-100';
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 overflow-y-auto h-screen relative">
                <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-surface-dark border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-md text-slate-500"><span className="material-symbols-outlined">menu</span></button>
                        <Link to="/" className="p-1 rounded-md text-slate-500"><span className="material-symbols-outlined">arrow_back</span></Link>
                        <span className="font-extrabold text-lg text-slate-900 dark:text-white">Inventario</span>
                    </div>
                </header>

                <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-10">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
                        <div className="flex items-center gap-5">
                            <Link to="/" className="hidden md:flex p-3 rounded-2xl bg-white dark:bg-surface-dark shadow-sm text-slate-500 hover:text-primary transition-all active:scale-95">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">Control de Equipos</h1>
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Gestión técnica y operativa de activos</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                            {user?.role === 'developer' && (
                                <>
                                    <input type="file" accept=".csv" ref={csvInputRef} onChange={handleCSVUpload} className="hidden" />
                                    <button onClick={handleDownloadTemplate} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                        Plantilla
                                    </button>
                                    <button onClick={() => csvInputRef.current?.click()} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
                                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                        IMPORTAR
                                    </button>
                                    <button onClick={() => setIsAddModalOpen(true)} className="flex-1 xl:flex-none bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                        NUEVO EQUIPO
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Sincronizando inventario...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                            {items.map(item => (
                                <div key={item.id} className="bg-white dark:bg-surface-dark rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all">
                                    <div className="h-56 bg-slate-50 relative overflow-hidden cursor-pointer" onClick={() => handleViewDetails(item)}>
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-4 right-4 z-10">
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest backdrop-blur-md ${getStatusStyles(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-white text-primary px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl">VER FICHA TÉCNICA</span>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight uppercase truncate flex-1 pr-2">{item.name}</h3>
                                            <span className="text-[10px] font-mono text-slate-400 font-bold">SN: {item.serialNumber}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium mb-4 line-clamp-2 min-h-[2.5rem]">{item.description}</p>

                                        {item.status === 'Asignado' && item.assignment && (
                                            <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="material-symbols-outlined text-[16px] text-blue-600">location_on</span>
                                                    <span className="text-[9px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest">Puesto {item.assignment.post}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Responsable: {item.assignment.operatorName}</p>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleChangeStatus(item, 'Disponible')} className="size-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Disponible">
                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                </button>
                                                <button onClick={() => handleChangeStatus(item, 'Asignado')} className="size-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Asignar">
                                                    <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
                                                </button>
                                                <button onClick={() => handleChangeStatus(item, 'En Taller')} className="size-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Taller">
                                                    <span className="material-symbols-outlined text-[20px]">build</span>
                                                </button>
                                            </div>
                                            <button onClick={() => handleViewDetails(item)} className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-1">
                                                Detalle
                                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODALS remain logic-heavy but cleaned up for AI compatibility */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">Registro de Equipo</h3>
                            <form onSubmit={handleAddItem} className="space-y-5">
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
                                    <input required placeholder="Ej: Pulidora, Escalera..." value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white focus:border-primary outline-none transition-all font-bold" /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción</label>
                                    <input required placeholder="Marca, Modelo, Estado..." value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white focus:border-primary outline-none transition-all font-bold" /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Número de Serie</label>
                                    <input required placeholder="S/N" value={newItem.serialNumber} onChange={e => setNewItem({ ...newItem, serialNumber: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white focus:border-primary outline-none transition-all font-bold" /></div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Evidencia Fotográfica</label>
                                    <div onClick={triggerFileInput} className="border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        {newItem.imageUrl ? (<img src={newItem.imageUrl} className="max-h-32 rounded-xl" />) : (<><span className="material-symbols-outlined text-4xl text-slate-200 mb-2">add_a_photo</span><p className="text-[10px] font-black text-slate-300 uppercase">Cargar Imagen</p></>)}
                                        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={(e) => handleImageUpload(e, setNewItem, 'imageUrl')} className="hidden" />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
                                        {isSubmitting ? 'Guardando...' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Simplified ASSIGN/MAINT/DETAILS for brevity - would follow same structural design */}
                {isAssignModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-lg p-8 shadow-2xl">
                            <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white uppercase tracking-tight">ASIGNAR EQUIPO</h3>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Equipo: {selectedItem.name}</p>
                            <form onSubmit={handleAssignComplete} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase pl-1">Sede / Cliente Receptor</label>
                                    <select required value={assignData.clientId} onChange={handleClientChange} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-primary">
                                        <option value="">Seleccione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Operario (Recibe)</label>
                                    <input required placeholder="Nombre completo" value={assignData.operatorName} onChange={e => setAssignData({ ...assignData, operatorName: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-primary" /></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Notas de Entrega</label>
                                    <textarea rows={2} value={assignData.observations} onChange={e => setAssignData({ ...assignData, observations: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-medium outline-none focus:border-primary resize-none" placeholder="Estado del equipo al entregar..." /></div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Evidencia de Entrega (Opcional)</label>
                                    <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        {assignData.evidenceUrl ? (
                                            <div className="relative group w-full">
                                                <img src={assignData.evidenceUrl} className="h-32 w-full object-cover rounded-xl" />
                                                <button onClick={(e) => { e.stopPropagation(); setAssignData({ ...assignData, evidenceUrl: '' }) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">close</span></button>
                                            </div>
                                        ) : (
                                            <><span className="material-symbols-outlined text-3xl text-slate-200 mb-2">add_a_photo</span><p className="text-[10px] font-black text-slate-300 uppercase">Foto del Soporte</p></>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" className="hidden"
                                            ref={input => {
                                                if (input) input.onchange = (e: any) => handleImageUpload(e, setAssignData, 'evidenceUrl');
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                                        {isSubmitting ? 'Procesando...' : 'Asignar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isMaintenanceModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-surface-dark rounded-3xl w-full max-w-lg p-8 shadow-2xl">
                            <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white uppercase tracking-tight text-amber-600 flex items-center gap-3">
                                <span className="material-symbols-outlined">build</span>
                                REMISIÓN A TALLER
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Activo: {selectedItem.name} / Serie: {selectedItem.serialNumber}</p>
                            <form onSubmit={handleMaintenanceComplete} className="space-y-6">
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Nombre Taller / Destino</label>
                                    <input required placeholder="Nombre del taller o proveedor" value={maintData.workshopName} onChange={e => setMaintData({ ...maintData, workshopName: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-amber-500" /></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Persona Recibe</label>
                                        <input required placeholder="Nombre técnico" value={maintData.receiverName} onChange={e => setMaintData({ ...maintData, receiverName: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-amber-500" /></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Motivo / Falla</label>
                                        <input required placeholder="Breve descripción" value={maintData.reason} onChange={e => setMaintData({ ...maintData, reason: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-bold outline-none focus:border-amber-500" /></div>
                                </div>

                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase pl-1">Observaciones Técnicas</label>
                                    <textarea rows={2} value={maintData.observations} onChange={e => setMaintData({ ...maintData, observations: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-50 dark:bg-slate-800 dark:border-slate-800 dark:text-white font-medium outline-none focus:border-amber-500 resize-none" placeholder="Estado detallado del equipo..." /></div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Soporte de Entrega (Opcional)</label>
                                    <div onClick={() => maintFileInputRef.current?.click()} className="border-4 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        {maintData.photoUrl ? (
                                            <div className="relative group w-full">
                                                <img src={maintData.photoUrl} className="h-32 w-full object-cover rounded-xl" />
                                                <button onClick={(e) => { e.stopPropagation(); setMaintData({ ...maintData, photoUrl: '' }) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">close</span></button>
                                            </div>
                                        ) : (
                                            <><span className="material-symbols-outlined text-3xl text-slate-200 mb-2">add_a_photo</span><p className="text-[10px] font-black text-slate-300 uppercase">Cargar Órden/Foto</p></>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" className="hidden"
                                            ref={maintFileInputRef}
                                            onChange={(e) => handleImageUpload(e, setMaintData, 'photoUrl')}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsMaintenanceModalOpen(false)} className="px-6 py-3 text-slate-400 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-amber-600/20 active:scale-95 transition-all">
                                        {isSubmitting ? 'Procesando...' : 'Enviar a Taller'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* DETAILS MODAL - Premium Layout */}
                {isDetailsModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-surface-dark rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col border border-white/10 custom-scrollbar">
                            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-start sticky top-0 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{selectedItem.name}</h2>
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyles(selectedItem.status)}`}>{selectedItem.status}</span>
                                    </div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Ficha Técnica ID: {selectedItem.id}</p>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="size-12 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all active:scale-90"><span className="material-symbols-outlined">close</span></button>
                            </div>

                            <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="rounded-[32px] overflow-hidden bg-slate-50 shadow-inner group relative">
                                        <img src={selectedItem.imageUrl} className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110" />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                                        <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Información de Sistema</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Serie</span><span className="font-mono text-xs font-black dark:text-white">{selectedItem.serialNumber}</span></div>
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-500 uppercase">Creado</span><span className="text-xs font-black dark:text-white">{new Date(parseInt(selectedItem.id)).toLocaleDateString()}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-8 space-y-10">
                                    {selectedItem.status === 'Asignado' && selectedItem.assignment && (
                                        <div className="bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-[32px] p-8 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-8xl">contact_emergency</span></div>
                                            <h3 className="font-black text-primary text-xl uppercase tracking-tighter mb-6 flex items-center gap-3"><span className="material-symbols-outlined">assignment_turned_in</span> Ubicación Actual</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sede Destinataria</p><p className="font-black text-lg text-slate-900 dark:text-white">{selectedItem.assignment.post}</p></div>
                                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p><p className="font-black text-lg text-slate-900 dark:text-white">{selectedItem.assignment.operatorName}</p></div>
                                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Entrega</p><p className="font-bold text-slate-700 dark:text-slate-300">{selectedItem.assignment.date}</p></div>
                                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Autorizado por</p><p className="font-bold text-slate-700 dark:text-slate-300">{selectedItem.assignment.supervisorName}</p></div>
                                            </div>
                                            {selectedItem.assignment.evidenceUrl && (
                                                <div className="mt-8 pt-6 border-t border-primary/20 relative z-10">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Evidencia de Entrega / Soporte</p>
                                                    <img src={selectedItem.assignment.evidenceUrl} className="h-40 w-auto rounded-xl border border-primary/20 shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                                            Historial de Asignaciones
                                            <span className="h-[2px] bg-slate-100 flex-1"></span>
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedItem.history && selectedItem.history.length > 0 ? selectedItem.history.map((assign, idx) => (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede / Puesto</p>
                                                            <p className="font-bold text-slate-900 dark:text-white">{assign.post}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo</p>
                                                            <p className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                {assign.date} - {assign.endDate || 'Actual'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Responsable:</span> <span className="font-medium">{assign.operatorName}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Supervisor:</span> <span className="font-medium">{assign.supervisorName}</span>
                                                        </div>
                                                    </div>
                                                    {assign.observations && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Observaciones</p>
                                                            <p className="text-xs italic text-slate-600 dark:text-slate-400">"{assign.observations}"</p>
                                                        </div>
                                                    )}
                                                    {assign.evidenceUrl && (
                                                        <div className="mt-3">
                                                            <a href={assign.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black text-primary uppercase hover:underline">
                                                                <span className="material-symbols-outlined text-sm">image</span>
                                                                Ver Evidencia
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )) : <p className="text-xs font-bold text-slate-400 italic text-center py-4">No hay asignaciones registradas.</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                                            Trazabilidad Operativa
                                            <span className="h-[2px] bg-slate-100 flex-1"></span>
                                        </h3>
                                        <div className="space-y-4">
                                            {selectedItem.statusLogs && selectedItem.statusLogs.length > 0 ? selectedItem.statusLogs.map((log) => (
                                                <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 group">
                                                    <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                                        <span className={`material-symbols-outlined text-[18px] ${log.newStatus === 'Asignado' ? 'text-blue-500' : log.newStatus === 'Disponible' ? 'text-emerald-500' : 'text-slate-400'}`}>history</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap justify-between items-center mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{log.newStatus}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-primary uppercase">{log.changedBy}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed">"{log.reason}"</p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-xs font-bold text-slate-400 italic text-center py-10 opacity-50">Sin historial de movimientos registrado en este activo.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-4 sticky bottom-0">
                                {user?.role === 'developer' && (
                                    <button onClick={() => handleDeleteItem(selectedItem.id)} disabled={isSubmitting} className="mr-auto text-red-500 hover:text-white hover:bg-red-500 px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                                        {isSubmitting ? 'Borrando...' : 'ELIMINAR ACTIVO'}
                                    </button>
                                )}
                                <button onClick={() => setIsDetailsModalOpen(false)} className="px-10 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl">Cerrar Ficha</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Inventory;