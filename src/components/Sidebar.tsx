import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { StorageService } from '../services/storage';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pendingNotifications, setPendingNotifications] = useState(0);

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Check for visits created by Admin/Developer that are pending for this supervisor
    useEffect(() => {
        if (user && user.role === 'supervisor') {
            const checkNotifications = async () => {
                const visits = await StorageService.getVisits();
                // Count pending visits assigned to me but created by someone else (Admin)
                const count = visits.filter(v =>
                    v.supervisorId === user.id &&
                    v.status === 'Pending' &&
                    v.createdBy !== user.id
                ).length;
                setPendingNotifications(count);
            };

            checkNotifications();
            // Simple polling to update notifications
            const interval = setInterval(checkNotifications, 5000);
            return () => clearInterval(interval);
        }
    }, [user]);

    if (!user) return null;

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-72 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="flex h-full flex-col justify-between p-4 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-4">

                        {/* Logo & Mobile Close */}
                        <div className="flex items-center justify-between lg:justify-center relative py-2">
                            <Link to="/" onClick={onClose}>
                                <img
                                    src="https://crenavzuzjpccsxfnfsp.supabase.co/storage/v1/object/public/Logo%20SGf/Logo-completo-sin-fondo.webp"
                                    alt="Logo"
                                    className="h-10 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                />
                            </Link>
                            {/* Mobile Close Button */}
                            <div className="lg:hidden">
                                <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-2 py-4 border-b border-border-light dark:border-border-dark mb-2">
                            <Link to="/profile" onClick={onClose} className="shrink-0 relative group">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 shadow-sm group-hover:ring-2 ring-primary transition-all" style={{ backgroundImage: `url("${user.avatarUrl || 'https://ui-avatars.com/api/?name=' + user.name}")` }}></div>
                                <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="material-symbols-outlined text-white text-sm">edit</span>
                                </div>
                            </Link>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-[#0d141b] dark:text-white text-base font-bold leading-normal truncate">{user.name}</h1>
                                <p className="text-[#4c739a] dark:text-slate-400 text-xs font-normal leading-normal capitalize truncate">{user.role}</p>
                            </div>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {/* Common Links */}
                            <Link to="/" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/') ? 'fill' : ''}`}>dashboard</span>
                                <p className="text-sm font-semibold leading-normal">Dashboard</p>
                            </Link>

                            <Link to="/profile" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/profile') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/profile') ? 'fill' : ''}`}>person</span>
                                <p className="text-sm font-medium leading-normal">Mi Perfil</p>
                            </Link>

                            <Link to="/messages" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/messages') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/messages') ? 'fill' : ''}`}>chat</span>
                                <p className="text-sm font-medium leading-normal">Mensajes</p>
                            </Link>

                            {/* Developer Specific */}
                            {user.role === 'developer' && (
                                <>
                                    <Link to="/supervisor-tracking" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/supervisor-tracking') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                        <span className={`material-symbols-outlined ${isActive('/supervisor-tracking') ? 'fill' : ''}`}>share_location</span>
                                        <p className="text-sm font-medium leading-normal">Monitoreo GPS</p>
                                    </Link>
                                    <Link to="/supervisors-manage" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/supervisors-manage') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                        <span className={`material-symbols-outlined ${isActive('/supervisors-manage') ? 'fill' : ''}`}>manage_accounts</span>
                                        <p className="text-sm font-medium leading-normal">Gestión de Usuarios</p>
                                    </Link>
                                </>
                            )}

                            <Link to="/clients" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/clients') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/clients') ? 'fill' : ''}`}>work</span>
                                <p className="text-sm font-medium leading-normal">Clientes</p>
                            </Link>

                            {/* Supervisor Specific */}
                            {user.role === 'supervisor' && (
                                <>
                                    <Link to="/my-visits" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/my-visits') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                        <div className="relative">
                                            <span className={`material-symbols-outlined ${isActive('/my-visits') ? 'fill' : ''}`}>location_on</span>
                                            {pendingNotifications > 0 && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white dark:ring-surface-dark">
                                                    {pendingNotifications > 9 ? '9+' : pendingNotifications}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium leading-normal flex-1">
                                            Mis Visitas
                                            {pendingNotifications > 0 && (
                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                    Nuevas
                                                </span>
                                            )}
                                        </p>
                                    </Link>
                                </>
                            )}

                            {/* Common with different permissions */}
                            <Link to="/inventory" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/inventory') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/inventory') ? 'fill' : ''}`}>inventory_2</span>
                                <p className="text-sm font-medium leading-normal">Inventario</p>
                            </Link>

                            <Link to="/reports" onClick={onClose} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/reports') ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0d141b] dark:text-slate-200'}`}>
                                <span className={`material-symbols-outlined ${isActive('/reports') ? 'fill' : ''}`}>description</span>
                                <p className="text-sm font-medium leading-normal">Reportes</p>
                            </Link>
                        </nav>
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-border-light dark:border-border-dark mt-2">
                        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 dark:text-red-400 transition-colors w-full text-left">
                            <span className="material-symbols-outlined">logout</span>
                            <p className="text-sm font-medium leading-normal">Cerrar Sesión</p>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;