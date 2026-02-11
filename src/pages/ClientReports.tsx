import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { StorageService } from '../services/storage';
import { Report, Visit } from '../types';

const ClientReports = () => {
    const { clientId } = useParams();
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [dates, setDates] = useState({ start: '', end: '' });
    const [clientName, setClientName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const loadClientReportsData = async () => {
            if (clientId) {
                setIsLoading(true);
                try {
                    const [reportsData, allClients] = await Promise.all([
                        StorageService.getReports(clientId),
                        StorageService.getClients()
                    ]);

                    setReports(reportsData);
                    setFilteredReports(reportsData);

                    const client = allClients.find(c => c.id === clientId);
                    if (client) setClientName(client.name);
                } catch (error) {
                    console.error('Error loading client reports', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadClientReportsData();
    }, [clientId]);

    const handleFilter = () => {
        if (!dates.start && !dates.end) {
            setFilteredReports(reports);
            return;
        }

        const start = dates.start ? new Date(dates.start) : new Date('2000-01-01');
        const end = dates.end ? new Date(dates.end) : new Date();

        const filtered = reports.filter(r => {
            const rDate = new Date(r.date);
            return rDate >= start && rDate <= end;
        });
        setFilteredReports(filtered);
    };

    const handleDownload = (report: Report) => {
        // En un entorno real, esto generaría un PDF o descargaría un archivo de Supabase Storage
        alert(`Descargando PDF: ${report.title}`);
    };

    const handleShare = async (report: Report) => {
        const shareUrl = `${window.location.origin}${window.location.pathname}#${report.url}`;

        const doCopy = async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert(`Link copiado: ${shareUrl}`);
            } catch (err) {
                console.error('Could not copy text: ', err);
                alert(`Link: ${shareUrl}`);
            }
        };

        if (navigator.share && shareUrl && shareUrl.startsWith('http')) {
            try {
                await navigator.share({
                    title: report.title,
                    text: `Informe Operativo - ${report.date}`,
                    url: shareUrl
                });
            } catch (error) {
                console.log('Share cancelled or failed', error);
                await doCopy();
            }
        } else {
            await doCopy();
        }
    };

    const handleExportCSV = async () => {
        if (filteredReports.length === 0) {
            alert('No hay reportes para exportar en el rango seleccionado.');
            return;
        }

        setIsExporting(true);
        try {
            // Fetch all full visits for the filtered reports
            const visitsToExport: Visit[] = await Promise.all(
                filteredReports.map(async (report) => {
                    return await StorageService.getVisitById(report.id) as Visit;
                })
            );

            const validVisits = visitsToExport.filter(v => !!v);

            if (validVisits.length === 0) {
                alert('Error al recuperar los detalles de las visitas.');
                return;
            }

            // Define Headers
            const headers = [
                "ID Visita",
                "Fecha Programada",
                "Fecha Ejecución",
                "Tipo",
                "Supervisor",
                "Estado",
                "Notas Iniciales",
                "Resumen Entrevista",
                "Observaciones / Hallazgos",
                "Enlace Reporte"
            ];

            const escapeField = (text: string | undefined) => {
                if (!text) return '""';
                return `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
            };

            const rows = validVisits.map(v => {
                const obsString = v.observations
                    ? v.observations.map(o => `[${o.severity}] ${o.title}: ${o.description}`).join('; ')
                    : 'Sin observaciones';

                const reportUrl = `${window.location.origin}${window.location.pathname}#/visit-details/${v.id}`;

                return [
                    v.id,
                    v.date,
                    v.completedDate || '-',
                    v.type,
                    v.supervisorName,
                    v.status,
                    escapeField(v.notes),
                    escapeField(v.interviewSummary),
                    escapeField(obsString),
                    reportUrl
                ].join(',');
            });

            const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);

            const dateStr = new Date().toISOString().slice(0, 10);
            const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute("download", `${safeClientName}_reportes_${dateStr}.csv`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting CSV', error);
            alert('Error al exportar los datos.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark font-display">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Link to="/reports" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Informes: {clientName || 'Cargando...'}</h1>
                            <p className="text-slate-500 font-medium">Historial de visitas completadas y reportes generados.</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 mb-8 flex flex-wrap gap-5 items-end">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</label>
                            <input type="date" value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })} className="px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Fin</label>
                            <input type="date" value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })} className="px-4 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleFilter} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20">
                                Filtrar
                            </button>
                            <button onClick={() => { setDates({ start: '', end: '' }); setFilteredReports(reports); }} className="px-4 py-2.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl text-sm font-bold transition-all">
                                Limpiar
                            </button>
                        </div>
                        <div className="flex-1 hidden md:block"></div>
                        <button
                            onClick={handleExportCSV}
                            disabled={isExporting || isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isExporting ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-[18px]">table_chart</span>}
                            {isExporting ? 'Exportando...' : 'Exportar CSV'}
                        </button>
                    </div>

                    {/* List */}
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-700 text-slate-500">
                                    <tr>
                                        <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Documento / Visita</th>
                                        <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Tipo</th>
                                        <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest">Fecha Cierre</th>
                                        <th className="px-8 py-5 font-black uppercase text-[10px] tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto pb-4"></div>
                                                <p className="text-xs font-bold text-slate-400 uppercase mt-4">Cargando bitácora...</p>
                                            </td>
                                        </tr>
                                    ) : filteredReports.length > 0 ? filteredReports.map(report => (
                                        <tr key={report.id} className="hover:bg-blue-50/30 dark:hover:bg-primary/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-red-200 dark:border-red-900/40">
                                                        <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{report.title}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {report.id.slice(0, 13)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    {report.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-600 dark:text-slate-400">{report.date}</td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDownload(report)} className="size-8 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all" title="Descargar">
                                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                                    </button>
                                                    <button onClick={() => handleShare(report)} className="size-8 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all" title="Compartir">
                                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                                    </button>
                                                    <Link to={report.url} className="ml-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm">
                                                        VER REPORTE
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="size-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300 dark:border-slate-800">
                                                    <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                                                </div>
                                                <p className="text-slate-500 font-bold">No se encontraron reportes en este rango de tiempo.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientReports;