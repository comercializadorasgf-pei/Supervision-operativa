import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Visit } from '../types';
import { StorageService } from '../services/storage';

interface VisitActionModalProps {
    visit: Visit | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh
}

const VisitActionModal: React.FC<VisitActionModalProps> = ({ visit, isOpen, onClose, onUpdate }) => {
    const navigate = useNavigate();
    const [action, setAction] = useState<'initial' | 'cancel' | 'reschedule'>('initial');
    const [reason, setReason] = useState('');
    const [newDate, setNewDate] = useState('');

    if (!isOpen || !visit) return null;

    const handleStart = () => {
        navigate(`/perform-visit/${visit.id}`);
    };

    const handleCancel = () => {
        if (!reason) return alert('Debe ingresar un motivo para cancelar.');
        const updatedVisit: Visit = {
            ...visit,
            status: 'Cancelled',
            cancelReason: reason
        };
        StorageService.updateVisit(updatedVisit);
        onUpdate();
        onClose();
        resetForm();
    };

    const handleReschedule = () => {
        if (!reason || !newDate) return alert('Debe ingresar nueva fecha y motivo.');
        const updatedVisit: Visit = {
            ...visit,
            status: 'Pending',
            originalDate: visit.date,
            date: newDate,
            rescheduleReason: reason,
            notes: (visit.notes ? visit.notes + '\n' : '') + `[Reprogramada de ${visit.date} a ${newDate}]: ${reason}`
        };
        StorageService.updateVisit(updatedVisit);
        onUpdate();
        onClose();
        resetForm();
    };

    const resetForm = () => {
        setAction('initial');
        setReason('');
        setNewDate('');
    };

    const close = () => {
        resetForm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {action === 'initial' ? 'Gestionar Visita' : action === 'cancel' ? 'Cancelar Visita' : 'Reprogramar Visita'}
                    </h3>
                    <button onClick={close} className="text-slate-500 hover:text-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {action === 'initial' && (
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={handleStart}
                                className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 transition-colors group text-left"
                            >
                                <div className="bg-green-500 text-white p-2 rounded-full">
                                    <span className="material-symbols-outlined text-xl">play_arrow</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-800 dark:text-green-300">Iniciar Visita</h4>
                                    <p className="text-xs text-green-600 dark:text-green-400">Comenzar el reporte operativo ahora.</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setAction('reschedule')}
                                className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-colors group text-left"
                            >
                                <div className="bg-blue-500 text-white p-2 rounded-full">
                                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300">Reprogramar</h4>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Cambiar fecha y notificar motivo.</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => setAction('cancel')}
                                className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors group text-left"
                            >
                                <div className="bg-red-500 text-white p-2 rounded-full">
                                    <span className="material-symbols-outlined text-xl">cancel</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-800 dark:text-red-300">Cancelar Visita</h4>
                                    <p className="text-xs text-red-600 dark:text-red-400">Anular la visita justificando la causa.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {action === 'cancel' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Por favor indique el motivo por el cual se cancela esta visita. Esta acción notificará a administración.
                            </p>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Escriba la nota del porqué..."
                                className="w-full h-32 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500"
                            ></textarea>
                            <div className="flex gap-3">
                                <button onClick={() => setAction('initial')} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Volver</button>
                                <button onClick={handleCancel} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">Confirmar Cancelación</button>
                            </div>
                        </div>
                    )}

                    {action === 'reschedule' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nueva Fecha</label>
                                <input 
                                    type="date" 
                                    value={newDate} 
                                    onChange={e => setNewDate(e.target.value)} 
                                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Motivo de Reprogramación</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Explique la razón del cambio..."
                                    className="w-full h-24 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setAction('initial')} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Volver</button>
                                <button onClick={handleReschedule} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Guardar Cambios</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisitActionModal;