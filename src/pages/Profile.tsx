import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../services/storage';

const Profile = () => {
    const { user, updateProfile } = useAuth();
    const [verificationModal, setVerificationModal] = useState<{ isOpen: boolean; field: 'email' | 'phone' | null; codeSent: boolean }>({
        isOpen: false,
        field: null,
        codeSent: false
    });
    const [verificationCode, setVerificationCode] = useState('');

    if (!user) return null;

    const handleVerifyStart = (field: 'email' | 'phone') => {
        setVerificationModal({ isOpen: true, field, codeSent: false });
        setVerificationCode('');
    };

    const handleSendCode = () => {
        // Mock sending code
        setVerificationModal(prev => ({ ...prev, codeSent: true }));
        setMsg({ text: `Código enviado a su ${verificationModal.field === 'email' ? 'correo' : 'celular'}. (Demo: 1234)`, type: 'success' });
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (verificationCode !== '1234') {
            setMsg({ text: 'Código incorrecto. Intente nuevamente.', type: 'error' });
            return;
        }

        try {
            if (!verificationModal.field) return;

            // Update DB
            await StorageService.toggleVerification(user.id, verificationModal.field, true);

            // Update Context
            const updatedUser = {
                ...user,
                [verificationModal.field === 'email' ? 'emailVerified' : 'phoneVerified']: true
            };
            await updateProfile(updatedUser);

            setMsg({ text: `${verificationModal.field === 'email' ? 'Correo' : 'Teléfono'} verificado correctamente.`, type: 'success' });
            setVerificationModal({ isOpen: false, field: null, codeSent: false });
        } catch (error) {
            console.error('Error verifying', error);
            setMsg({ text: 'Error en la verificación.', type: 'error' });
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ text: '', type: '' });
        setIsUpdating(true);

        if (pwdData.new !== pwdData.confirm) {
            setMsg({ text: 'Las nuevas contraseñas no coinciden.', type: 'error' });
            setIsUpdating(false);
            return;
        }

        if (pwdData.new.length < 6) {
            setMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
            setIsUpdating(false);
            return;
        }

        try {
            // In Supabase, usually you update password via Auth API
            // For this app we have a mock/storage based user mgmt for now
            await StorageService.updatePassword(user.id, pwdData.new);
            setMsg({ text: 'Contraseña actualizada correctamente.', type: 'success' });
            setPwdData({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error('Error updating password', error);
            setMsg({ text: 'Error al actualizar la contraseña.', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const newAvatarUrl = reader.result as string;
                try {
                    await updateProfile({ ...user, avatarUrl: newAvatarUrl });
                    setMsg({ text: 'Foto de perfil actualizada.', type: 'success' });
                } catch (error) {
                    console.error('Error updating profile photo', error);
                    setMsg({ text: 'Error al actualizar la foto.', type: 'error' });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ text: '', type: '' });
        setIsUpdating(true);

        try {
            const updatedUser = {
                ...user,
                ...editFormData
            };

            // Update database
            await StorageService.updateUser(updatedUser);
            // Update auth state
            await updateProfile(updatedUser);

            setMsg({ text: 'Perfil actualizado correctamente.', type: 'success' });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error updating profile', error);
            setMsg({ text: 'Error al actualizar el perfil.', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    const openEditModal = () => {
        setEditFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            position: user.position
        });
        setIsEditModalOpen(true);
    };

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-20 shadow-sm">
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
                        <span className="font-extrabold text-lg text-slate-900 dark:text-white">Mi Perfil</span>
                    </div>
                </header>

                <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <Link to="/" className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Mi Perfil</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Profile Card */}
                        <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-xl">
                            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                            <div className="px-8 pb-8">
                                <div className="relative flex justify-between items-end -mt-12 mb-6">
                                    <div className="relative group">
                                        <div className="size-24 rounded-full border-4 border-white dark:border-surface-dark bg-white shadow-xl overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}`} alt="Profile" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                        />
                                    </div>
                                    <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-bold border border-primary/20 capitalize shadow-sm">
                                        {user.role}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo / Puesto</label>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{user.position}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                                            {user.emailVerified ? (
                                                <span className="text-green-500 material-symbols-outlined text-[16px]" title="Verificado">verified</span>
                                            ) : (
                                                <button onClick={() => handleVerifyStart('email')} className="text-[10px] text-red-500 font-bold hover:underline">VERIFICAR</button>
                                            )}
                                        </div>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{user.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono Móvil</label>
                                            {user.phoneVerified ? (
                                                <span className="text-green-500 material-symbols-outlined text-[16px]" title="Verificado">verified</span>
                                            ) : (
                                                <button onClick={() => handleVerifyStart('phone')} className="text-[10px] text-red-500 font-bold hover:underline">VERIFICAR</button>
                                            )}
                                        </div>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">{user.phone}</p>
                                    </div>
                                </div>

                                {user.role === 'developer' && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                        <button
                                            onClick={openEditModal}
                                            className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-bold text-sm transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                            Editar Perfil
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security Card */}
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">security</span>
                                Seguridad
                            </h3>

                            {msg.text && (
                                <div className={`mb-6 p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{msg.type === 'success' ? 'check_circle' : 'error'}</span>
                                    {msg.text}
                                </div>
                            )}

                            <form onSubmit={handlePasswordChange} className="space-y-5 flex-1 flex flex-col">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Contraseña Actual</label>
                                    <input type="password" required value={pwdData.current} onChange={e => setPwdData({ ...pwdData, current: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nueva Contraseña</label>
                                    <input type="password" required value={pwdData.new} onChange={e => setPwdData({ ...pwdData, new: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmar Nueva</label>
                                    <input type="password" required value={pwdData.confirm} onChange={e => setPwdData({ ...pwdData, confirm: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                                </div>
                                <div className="pt-4 mt-auto">
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className={`w-full py-3 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-black transition-all shadow-md active:scale-95 disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-dark flex items-center justify-center gap-2`}
                                    >
                                        {isUpdating && <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        {isUpdating ? 'Actualizando...' : 'Actualizar Contraseña'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Edit Profile Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_edit</span>
                                Editar Mi Perfil
                            </h3>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</label>
                                    <input required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargo / Puesto</label>
                                    <input required value={editFormData.position} onChange={e => setEditFormData({ ...editFormData, position: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Correo Electrónico</label>
                                    <input required type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Teléfono Móvil</label>
                                    <input required value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full p-2.5 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white dark:border-slate-700 font-bold transition-all">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
                                    >
                                        {isUpdating && <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Verification Modal */}
                {verificationModal.isOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">verified_user</span>
                                Verificar {verificationModal.field === 'email' ? 'Correo' : 'Teléfono'}
                            </h3>

                            {!verificationModal.codeSent ? (
                                <div className="text-center">
                                    <p className="text-slate-500 mb-6">Se enviará un código de verificación a su {verificationModal.field === 'email' ? 'correo electrónico' : 'teléfono móvil'}.</p>
                                    <button
                                        onClick={handleSendCode}
                                        className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        Enviar Código
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleVerifySubmit} className="space-y-4">
                                    <p className="text-sm text-slate-500 mb-2">Ingrese el código de 4 dígitos enviado:</p>
                                    <input
                                        autoFocus
                                        value={verificationCode}
                                        onChange={e => setVerificationCode(e.target.value)}
                                        maxLength={4}
                                        placeholder="0000"
                                        className="w-full text-center text-3xl tracking-[1em] font-bold p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <small className="block text-center text-slate-400">El código de demostración es <b>1234</b></small>
                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black shadow-lg shadow-green-600/20 transition-all active:scale-95 mt-4"
                                    >
                                        Verificar
                                    </button>
                                </form>
                            )}

                            <button
                                onClick={() => setVerificationModal({ isOpen: false, field: null, codeSent: false })}
                                className="w-full mt-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Profile;