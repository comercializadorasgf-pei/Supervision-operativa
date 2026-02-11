import React from 'react';
import { Visit } from '../types';

interface VisitPreviewModalProps {
    visit: Visit | null;
    isOpen: boolean;
    onClose: () => void;
}

const VisitPreviewModal: React.FC<VisitPreviewModalProps> = ({ visit, isOpen, onClose }) => {
    if (!isOpen || !visit) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100';
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark rounded-xl w-full max-w-2xl shadow-2xl flex flex-col transform transition-all scale-100">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {visit.type}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusColor(visit.status)}`}>
                                {getStatusLabel(visit.status)}
                            </span>
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">ID: #{visit.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Validation Alerts for Dev/Sup */}
                    {visit.status === 'Cancelled' && visit.cancelReason && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <h3 className="font-bold text-red-800 dark:text-red-300 text-sm uppercase mb-1">Motivo de Cancelación</h3>
                            <p className="text-slate-800 dark:text-slate-200 text-sm">"{visit.cancelReason}"</p>
                        </div>
                    )}

                    {visit.rescheduleReason && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm uppercase mb-1">Historial de Reprogramación</h3>
                            <p className="text-slate-800 dark:text-slate-200 text-sm mb-1">"{visit.rescheduleReason}"</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">Fecha original: {visit.originalDate}</p>
                        </div>
                    )}

                    {/* Notes Section - Highlighted if present */}
                    {visit.notes && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded-r-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">sticky_note_2</span>
                                <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm uppercase">Notas / Instrucciones</h3>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 text-sm italic whitespace-pre-line">
                                "{visit.notes}"
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente / Empresa</label>
                            <div className="flex items-start gap-3">
                                {visit.clientPhotoUrl ? (
                                    <img src={visit.clientPhotoUrl} alt="Logo" className="size-12 rounded-lg object-cover border border-slate-200" />
                                ) : (
                                    <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                                        {visit.clientName.substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{visit.clientName}</p>
                                    {visit.clientNit && <p className="text-xs text-slate-500">NIT: {visit.clientNit}</p>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Supervisor Asignado</label>
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <img src={`https://ui-avatars.com/api/?name=${visit.supervisorName}&background=random`} alt="Sup" />
                                </div>
                                <p className="font-medium text-slate-900 dark:text-white">{visit.supervisorName}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Programada</label>
                            <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                                {visit.date}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-bold transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VisitPreviewModal;