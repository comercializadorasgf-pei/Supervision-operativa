import { StorageService } from '../services/storage';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [sent, setSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Find user by email
            const users = await StorageService.getUsers();
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                setError('No se encontró ninguna cuenta vinculada a este correo.');
                setIsLoading(false);
                return;
            }

            // Update password
            await StorageService.updatePassword(user.id, password);
            setSent(true);
        } catch (err) {
            console.error('Error resetting password:', err);
            setError('Ocurrió un error al restablecer la contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
                <div className="flex flex-col items-center mb-6">
                    <img
                        src="https://crenavzuzjpccsxfnfsp.supabase.co/storage/v1/object/public/Logo%20SGf/Logo-completo-sin-fondo.webp"
                        alt="Logo"
                        className="h-20 w-auto object-contain mb-4"
                    />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar Contraseña</h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {!sent ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-4">
                            Ingresa tu correo y la **nueva contraseña** que deseas asignar a tu cuenta.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Nueva contraseña"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                            {isLoading ? 'Procesando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                ) : (
                    <div className="text-center animate-in zoom-in-95 duration-300">
                        <div className="bg-green-50 text-green-700 p-6 rounded-xl mb-6 border border-green-100 shadow-sm flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                            <div className="text-center">
                                <p className="font-black text-lg uppercase tracking-tight">¡Contraseña Actualizada!</p>
                                <p className="text-sm font-medium mt-1">Ya puedes ingresar con tus nuevas credenciales.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-sm text-primary hover:underline font-medium">Volver a Iniciar Sesión</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;