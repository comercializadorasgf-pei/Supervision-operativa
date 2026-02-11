import React from 'react';

const Preloader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background-light dark:bg-background-dark transition-all duration-500">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>

            <div className="relative flex flex-col items-center">
                {/* Logo with pulse effect */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-ping opacity-30"></div>
                    <div className="relative bg-white dark:bg-surface-dark p-6 rounded-[32px] shadow-2xl border border-white/50 dark:border-white/5 animate-pulse">
                        <img
                            src="https://crenavzuzjpccsxfnfsp.supabase.co/storage/v1/object/public/Logo%20SGf/Logo-completo-sin-fondo.webp"
                            alt="Logo"
                            className="h-20 w-auto object-contain"
                        />
                    </div>
                </div>

                {/* Loading Status */}
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] mb-4">
                        Sincronizando Sistema
                    </h2>
                    <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-primary animate-[loading_1.5s_ease-in-out_infinite]"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes loading {
                    0% { left: -100%; width: 50%; }
                    50% { left: 0%; width: 100%; }
                    100% { left: 100%; width: 50%; }
                }
            `}</style>
        </div>
    );
};

export default Preloader;
