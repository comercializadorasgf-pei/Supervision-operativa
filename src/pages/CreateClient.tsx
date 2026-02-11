import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CreateClient = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nit: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        photoUrl: ''
    });

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    React.useEffect(() => {
        if (user && user.role !== 'developer') {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Get initials
            const initials = formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Random color class
            const colors = [
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
                'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
                'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
            ];
            const colorClass = colors[Math.floor(Math.random() * colors.length)];

            const newClient: Client = {
                id: '', // Handled by StorageService
                initials,
                status: 'Active',
                totalVisits: 0,
                lastVisitDate: '-',
                colorClass,
                ...formData
            };

            await StorageService.addClient(newClient);
            navigate('/clients');
        } catch (error) {
            console.error('Error creating client', error);
            alert('Error al crear el cliente. Por favor intente de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <header className="flex items-center gap-4 mb-8">
                        <Link to="/clients" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Registrar Nuevo Cliente</h1>
                            <p className="text-slate-500 text-sm">Ingrese los datos de la empresa para habilitar visitas.</p>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">info</span>
                            <p className="text-sm text-blue-700 dark:text-blue-300">El ID del cliente será generado automáticamente por el sistema al guardar.</p>
                        </div>

                        {/* Photo Section */}
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                className="hidden"
                            />
                            <div
                                onClick={triggerFileInput}
                                className="cursor-pointer flex flex-col items-center text-center"
                            >
                                {formData.photoUrl ? (
                                    <div className="relative size-32 mb-2">
                                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                            <span className="text-white text-xs font-bold">Cambiar Foto</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="size-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2 text-slate-400">
                                        <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                    </div>
                                )}
                                <span className="text-sm font-medium text-primary hover:underline">
                                    {formData.photoUrl ? 'Cambiar Foto Corporativa' : 'Subir o Tomar Foto del Cliente'}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">(Opcional) Logo o fachada</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de la Empresa / Cliente</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. Corporativo Tech S.A." />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">NIT / RUC</label>
                                <input required value={formData.nit} onChange={e => setFormData({ ...formData, nit: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. 900.123.456-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Contacto</label>
                                <input required value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. Roberto Gómez" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="contacto@empresa.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                                <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="+52 55..." />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección Física</label>
                                <textarea required rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder="Calle, Número, Colonia, Ciudad..." />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                            <Link to="/clients" className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-6 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateClient;