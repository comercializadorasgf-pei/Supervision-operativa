import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { User } from '../types';

const SupervisorsManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Forms
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        position: '',
        password: '',
        role: 'supervisor' as 'supervisor' | 'developer'
    });
    const [newPassword, setNewPassword] = useState('');

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await StorageService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [isCreateModalOpen, isResetModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEditMode && selectedUser) {
                const updatedUser: User = {
                    ...selectedUser,
                    role: formData.role,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    position: formData.position,
                    avatarUrl: formData.name !== selectedUser.name
                        ? `https://ui-avatars.com/api/?name=${formData.name}&background=random`
                        : selectedUser.avatarUrl
                };
                await StorageService.updateUser(updatedUser);
            } else {
                const newUser: User = {
                    id: '', // Handled by StorageService/Supabase
                    role: formData.role,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    position: formData.position,
                    avatarUrl: `https://ui-avatars.com/api/?name=${formData.name}&background=random`
                };
                await StorageService.addUser(newUser, formData.password);
            }
            setIsCreateModalOpen(false);
            setFormData({ name: '', email: '', phone: '', position: '', password: '', role: 'supervisor' });
            setIsEditMode(false);
            setSelectedUser(null);
            await loadUsers();
        } catch (error) {
            console.error('Error saving user', error);
            alert('Error al guardar usuario.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
            try {
                await StorageService.deleteUser(userId);
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
                console.error('Error deleting user', error);
                alert('Error al eliminar usuario.');
            }
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUser && newPassword) {
            setIsSubmitting(true);
            try {
                await StorageService.updatePassword(selectedUser.id, newPassword);
                alert(`Contraseña actualizada correctamente para ${selectedUser.name}`);
                setIsResetModalOpen(false);
                setNewPassword('');
                setSelectedUser(null);
            } catch (error) {
                console.error('Error resetting password', error);
                alert('Error al resetear contraseña.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const openResetModal = (user: User) => {
        setSelectedUser(user);
        setIsResetModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsEditMode(true);
        setFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            position: user.position,
            password: '', // Password not needed for update
            role: user.role
        });
        setIsCreateModalOpen(true);
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setSelectedUser(null);
        setFormData({ name: '', email: '', phone: '', position: '', password: '', role: 'supervisor' });
        setIsCreateModalOpen(true);
    };

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
                        <span className="font-extrabold text-lg text-slate-900 dark:text-white">Gestión de Usuarios</span>
                    </div>
                </header>

                <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gestión de Usuarios</h1>
                                <p className="text-slate-500 font-medium">Administra desarrolladores y supervisores de la plataforma.</p>
                            </div>
                        </div>
                        <button onClick={openCreateModal} className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-primary/20 w-full md:w-auto justify-center transition-all active:scale-95">
                            <span className="material-symbols-outlined">person_add</span>
                            Nuevo Usuario
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-20">
                            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map(userItem => (
                                <div key={userItem.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center relative group transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(userItem)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-primary transition-colors" title="Editar Perfil">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button onClick={() => openResetModal(userItem)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors" title="Restablecer Contraseña">
                                            <span className="material-symbols-outlined text-[18px]">key</span>
                                        </button>
                                        <button onClick={() => handleDelete(userItem.id)} className="size-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Eliminar Usuario">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>

                                    <div className="relative mb-4">
                                        <img src={userItem.avatarUrl} alt={userItem.name} className="size-24 rounded-full object-cover border-4 border-slate-50 dark:border-slate-800 shadow-sm" />
                                        <div className={`absolute bottom-2 right-0 size-6 rounded-full border-2 border-white dark:border-surface-dark flex items-center justify-center ${userItem.role === 'developer' ? 'bg-indigo-600' : 'bg-emerald-500'}`} title={userItem.role === 'developer' ? 'Administrador' : 'Supervisor'}>
                                            <span className="material-symbols-outlined text-white text-[14px]">
                                                {userItem.role === 'developer' ? 'shield_person' : 'engineering'}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white line-clamp-1">{userItem.name}</h3>
                                    <p className="text-primary text-xs font-black uppercase tracking-widest mb-4">{userItem.position}</p>

                                    <div className="w-full space-y-2.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">Rol:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${userItem.role === 'developer' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'}`}>
                                                {userItem.role === 'developer' ? 'Desarrollador' : 'Supervisor'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">Email:</span>
                                            <div className="flex items-center gap-1 overflow-hidden">
                                                <span className="text-slate-900 dark:text-white font-bold truncate max-w-[130px]" title={userItem.email}>{userItem.email}</span>
                                                {userItem.emailVerified && <span className="material-symbols-outlined text-[14px] text-green-500" title="Verificado">verified</span>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold">Teléfono:</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-900 dark:text-white font-bold">{userItem.phone}</span>
                                                {userItem.phoneVerified && <span className="material-symbols-outlined text-[14px] text-green-500" title="Verificado">verified</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">
                                {isEditMode ? 'Editar Perfil de Usuario' : 'Crear Nuevo Usuario'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de Usuario</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value="supervisor">Supervisor (Operativo)</option>
                                        <option value="developer">Desarrollador (Admin)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                                    <input required placeholder="Ej. Juan Perez" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Correo</label>
                                    <input required type="email" placeholder="email@empresa.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Teléfono</label>
                                        <input required placeholder="300 0000000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargo</label>
                                        <input required placeholder="Ej. Coord. Zonal" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium" />
                                    </div>
                                </div>

                                {isEditMode ? (
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-xl">
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest">Aviso</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">La edición de perfil no permite cambiar la contraseña. Use la opción de "Resetear Acceso" para ello.</p>
                                    </div>
                                ) : (
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Contraseña Inicial</label>
                                        <input required type="password" placeholder="Asignar contraseña fuerte" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white dark:border-slate-700 font-bold transition-all">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
                                    >
                                        {isSubmitting && <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Usuario')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Reset Password Modal */}
                {isResetModalOpen && selectedUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">key</span>
                                Resetear Acceso
                            </h3>
                            <p className="text-sm text-slate-500 mb-6 font-medium">Asignar nueva clave para <b>{selectedUser.name}</b>.</p>
                            <form onSubmit={handleResetPassword} className="space-y-5">
                                <input required type="password" placeholder="Nueva contraseña alfanumérica" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20 shadow-inner" />
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 px-4 py-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white dark:border-slate-700 font-bold">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl hover:opacity-90 font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting && <div className="size-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
                                        Actualizar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SupervisorsManagement;