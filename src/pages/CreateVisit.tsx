import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { Client, User, Visit } from '../types';

const CreateVisit = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [clients, setClients] = useState<Client[]>([]);
    const [supervisors, setSupervisors] = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({
        clientInput: '', // Can be name or ID
        supervisorId: '',
        startDate: new Date().toISOString().split('T')[0],
        type: 'Visita Mensual',
        notes: '',
        frequency: 'once', // once, weekly, biweekly, monthly
        occurrences: 1
    });

    const [generatedDates, setGeneratedDates] = useState<string[]>([]);

    useEffect(() => {
        const calculateDates = () => {
            const dates: string[] = [];
            let start = new Date(formData.startDate);

            for (let i = 0; i < formData.occurrences; i++) {
                const current = new Date(start);
                if (formData.frequency === 'weekly') {
                    current.setDate(start.getDate() + (i * 7));
                } else if (formData.frequency === 'biweekly') {
                    current.setDate(start.getDate() + (i * 14));
                } else if (formData.frequency === 'monthly') {
                    current.setMonth(start.getMonth() + i);
                } else {
                    if (i > 0) break;
                }
                dates.push(current.toISOString().split('T')[0]);
            }
            setGeneratedDates(dates);
        };
        calculateDates();
    }, [formData.startDate, formData.frequency, formData.occurrences]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [allClients, allUsers] = await Promise.all([
                    StorageService.getClients(),
                    StorageService.getUsers()
                ]);

                setClients(allClients);
                const sups = allUsers.filter(u => u.role === 'supervisor');
                setSupervisors(sups);

                // Auto-select self if supervisor
                if (user?.role === 'supervisor' && !formData.supervisorId) {
                    setFormData(prev => ({ ...prev, supervisorId: user.id }));
                }
            } catch (error) {
                console.error('Error loading initial data for visit creation', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [user, formData.supervisorId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        try {
            let clientName = formData.clientInput;
            let clientId = `MANUAL-${Date.now()}`;

            const existingClient = clients.find(c =>
                c.name.toLowerCase() === formData.clientInput.toLowerCase() ||
                `${c.name} (ID: ${c.id})` === formData.clientInput ||
                formData.clientInput.includes(`(ID: ${c.id})`)
            );

            if (existingClient) {
                clientId = existingClient.id;
                clientName = existingClient.name;
            }

            const supervisorIdToUse = user.role === 'developer' ? formData.supervisorId : user.id;
            const selectedSupervisor = [...supervisors, user].find(u => u.id === supervisorIdToUse);

            if (!selectedSupervisor) {
                alert('Por favor seleccione un supervisor válido.');
                setIsSubmitting(false);
                return;
            }

            for (const date of generatedDates) {
                const newVisit: Visit = {
                    id: '', // Handled by backend usually, but our service handles placeholder
                    clientId: clientId,
                    clientName: clientName,
                    supervisorId: selectedSupervisor.id,
                    supervisorName: selectedSupervisor.name,
                    status: 'Pending',
                    date: date,
                    type: formData.type,
                    notes: formData.notes,
                    createdBy: user.id,
                    creatorName: user.name,
                    hasReport: false
                };

                await StorageService.addVisit(newVisit);
            }

            if (user.role === 'developer') {
                navigate('/');
            } else {
                navigate('/my-visits');
            }
        } catch (error) {
            console.error('Error creating visit', error);
            alert('Error al programar la visita.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <header className="flex items-center gap-4 mb-8">
                        <Link to={user?.role === 'developer' ? '/' : '/my-visits'} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Programar Nueva Visita</h1>
                            <p className="text-slate-500 font-medium">
                                {user?.role === 'developer'
                                    ? 'Asigne una visita operativa a un supervisor.'
                                    : 'Registre una nueva visita en su calendario.'}
                            </p>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Client Selection */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente / Razon Social</label>
                                <div className="relative group">
                                    <input
                                        list="clients-list"
                                        required
                                        value={formData.clientInput}
                                        onChange={e => setFormData({ ...formData, clientInput: e.target.value })}
                                        placeholder="Busque un cliente o escriba nombre de sede..."
                                        className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                    />
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                </div>
                                <datalist id="clients-list">
                                    {clients.map(client => (
                                        <option key={client.id} value={`${client.name} (ID: ${client.id})`} />
                                    ))}
                                </datalist>
                                <div className="flex items-center gap-2 mt-2 px-2">
                                    <span className="material-symbols-outlined text-[14px] text-primary">info</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Sugerencia: Escribe el nombre para buscar en la base de datos existente.</p>
                                </div>
                            </div>

                            {/* Supervisor Selection (Admin Only) */}
                            {user?.role === 'developer' && (
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Asignar Supervisor Responsable</label>
                                    <select
                                        required
                                        value={formData.supervisorId}
                                        onChange={e => setFormData({ ...formData, supervisorId: e.target.value })}
                                        className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                    >
                                        <option value="">Seleccione un Supervisor...</option>
                                        {supervisors.map(sup => (
                                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Date & Frequency */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Inicio</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Frecuencia de Visita</label>
                                <select
                                    required
                                    value={formData.frequency}
                                    onChange={e => setFormData({ ...formData, frequency: e.target.value, occurrences: e.target.value === 'once' ? 1 : formData.occurrences })}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                >
                                    <option value="once">Solo una vez</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="biweekly">Quincenal</option>
                                    <option value="monthly">Mensual</option>
                                </select>
                            </div>

                            {formData.frequency !== 'once' && (
                                <div className="space-y-1.5 animate-in fade-in zoom-in duration-200">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Número de Repeticiones</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="52"
                                        required
                                        value={formData.occurrences}
                                        onChange={e => setFormData({ ...formData, occurrences: parseInt(e.target.value) || 1 })}
                                        className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium px-1">Se generarán {formData.occurrences} visitas en total.</p>
                                </div>
                            )}

                            {formData.frequency !== 'once' && (
                                <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                        Fechas Programadas:
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedDates.map((d, i) => (
                                            <span key={i} className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold text-primary border border-primary/20">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Acción Operativa</label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                >
                                    <option value="Visita Mensual">Visita Operativa Mensual</option>
                                    <option value="Auditoría">Auditoría Sorpresa</option>
                                    <option value="Incidente">Reporte de Incidente</option>
                                    <option value="Capacitación">Capacitación de Personal</option>
                                    <option value="Entrega">Entrega de Insumos/Equipo</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrucciones Especiales</label>
                                <textarea
                                    rows={4}
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium resize-none"
                                    placeholder="Ingrese aquí detalles específicos o temas a tratar durante la visita..."
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                            <Link to={user?.role === 'developer' ? '/' : '/my-visits'} className="px-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-all">
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-8 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50`}
                            >
                                {isSubmitting ? (
                                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                )}
                                {isSubmitting ? 'PROGRAMANDO...' : 'PROGRAMAR VISITA'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateVisit;