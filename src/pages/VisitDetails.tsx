import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Visit } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const VisitDetails = () => {
    const { visitId } = useParams();
    const [visit, setVisit] = useState<Visit | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadVisit = async () => {
            if (visitId) {
                setIsLoading(true);
                try {
                    const data = await StorageService.getVisitById(visitId);
                    if (data) setVisit(data);
                } catch (error) {
                    console.error('Error loading visit details', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        loadVisit();
    }, [visitId]);

    const handlePrint = () => {
        window.print();
    };

    const generatePDFBlob = async (): Promise<Blob | null> => {
        if (!reportRef.current) return null;

        setIsGenerating(true);
        // Esperar un momento para que el estado se actualice y muestre elementos ocultos si es necesario
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // Mejor calidad
                useCORS: true, // Para cargar imágenes externas
                logging: false,
                windowWidth: 1200 // Forzar ancho desktop
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // Ajustar altura proporcionalmente, manteniendo márgenes mínimos
            const finalWidth = pdfWidth;
            const finalHeight = (imgHeight * pdfWidth) / imgWidth;

            // Si es muy largo, jspdf corta, para este ejemplo simple asumimos una página o escalado
            // Para multipágina se requeriría lógica más compleja de split
            if (finalHeight > pdfHeight) {
                // Ajustar para que quepa en una página (shrink to fit)
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            } else {
                pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
            }

            return pdf.output('blob');
        } catch (error) {
            console.error("Error generating PDF", error);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = async () => {
        const blob = await generatePDFBlob();
        if (blob && visit) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_${visit.clientName.replace(/\s+/g, '_')}_${visit.date}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('Error al generar el PDF.');
        }
    };

    const handleShare = async () => {
        // Opción 1: Compartir enlace si no soporta archivos
        const shareUrl = window.location.href;

        // Opción 2: Generar y compartir archivo
        if (navigator.canShare && navigator.share) {
            const blob = await generatePDFBlob();
            if (blob && visit) {
                const file = new File([blob], `Reporte_${visit.id}.pdf`, { type: 'application/pdf' });
                try {
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: `Reporte Visita #${visit.id}`,
                            text: `Adjunto informe de visita operativa a ${visit.clientName}.`,
                            files: [file]
                        });
                        return;
                    }
                } catch (e) {
                    console.log("Share file failed, falling back to URL", e);
                }
            }
        }

        // Fallback al portapapeles / URL
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Enlace copiado al portapapeles (Tu dispositivo no soporta compartir archivos directamente).');
        } catch (err) {
            alert('No se pudo compartir.');
        }
    };

    // Helper to format ISO string to "DD/MM/YYYY HH:MM:SS"
    const formatDateTime = (isoString?: string) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('es-MX', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return isoString;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!visit) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background-light dark:bg-background-dark p-8 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Visita no encontrada</p>
                <Link to="/my-visits" className="text-primary hover:underline">Volver a mis visitas</Link>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display print:bg-white print:text-black print:block">
            <main className="flex-1 flex flex-col min-w-0">
                {/* App Header - Hidden on Print and PDF Gen */}
                {!isGenerating && (
                    <header className="flex items-center justify-between whitespace-nowrap border-b border-[#e5e7eb] dark:border-[#2a3b4d] bg-surface-light dark:bg-surface-dark px-6 py-3 sticky top-0 z-20 print:hidden font-bold">
                        <div className="flex items-center gap-4">
                            <Link to="/my-visits" className="text-[#637588] dark:text-[#94a3b8] flex items-center gap-2 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">arrow_back</span>
                                Volver
                            </Link>
                            <h2 className="text-[#111418] dark:text-white text-lg font-bold hidden sm:block">Detalle Visita #{visit.id}</h2>
                        </div>
                        {visit.status === 'Completed' && (
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Imprimir">
                                    <span className="material-symbols-outlined">print</span>
                                </button>
                                <button onClick={handleShare} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Compartir PDF">
                                    <span className="material-symbols-outlined">share</span>
                                </button>
                                <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                                    {isGenerating ? (
                                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                    )}
                                    {isGenerating ? 'Generando...' : 'Descargar PDF'}
                                </button>
                            </div>
                        )}
                    </header>
                )}

                {/* 
                    Main Content Container - Ref for PDF Generation 
                    We maintain the layout but ensure bg is white for PDF
                */}
                <div ref={reportRef} className={`flex-1 p-6 md:p-10 overflow-y-auto print:p-0 print:overflow-visible ${isGenerating ? 'bg-white text-black p-8' : ''}`}>

                    {/* 
                        Formal Header for PDF/Print 
                        Visible ONLY when printing or isGenerating is true
                    */}
                    <div className={`${isGenerating ? 'block mb-8' : 'hidden print:block'} mb-8 border border-black`}>
                        <div className="flex w-full">
                            <div className="w-1/4 border-r border-black p-4 flex items-center justify-center">
                                <img
                                    src="https://crenavzuzjpccsxfnfsp.supabase.co/storage/v1/object/public/Logo%20SGf/Logo-completo-sin-fondo.webp"
                                    alt="Logo"
                                    className="max-h-16 w-auto object-contain"
                                />
                            </div>
                            <div className="w-2/4 border-r border-black p-2 flex flex-col items-center justify-center text-center">
                                <h1 className="text-xl font-bold uppercase leading-tight">FORMATO VISITA OPERATIVA</h1>
                                <p className="text-xs uppercase mt-1">Departamento de Calidad y Procesos</p>
                            </div>
                            <div className="w-1/4 flex flex-col">
                                <div className="flex-1 border-b border-black p-1 px-2 text-xs flex justify-between items-center">
                                    <span className="font-bold">Código:</span> <span>PER-SUP-001</span>
                                </div>
                                <div className="flex-1 border-b border-black p-1 px-2 text-xs flex justify-between items-center">
                                    <span className="font-bold">Versión:</span> <span>1.0.1</span>
                                </div>
                                <div className="flex-1 border-b border-black p-1 px-2 text-xs flex justify-between items-center">
                                    <span className="font-bold">Fecha:</span> <span>{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="flex-1 p-1 px-2 text-xs flex justify-between items-center">
                                    <span className="font-bold">Página:</span> <span>1 de 1</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
                        {/* Title Section (Screen Only) */}
                        {!isGenerating && (
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <h1 className="text-[#111418] dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                            {visit.clientName}
                                        </h1>
                                        <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold border ${visit.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                            <span className="material-symbols-outlined text-[16px] fill">{visit.status === 'Completed' ? 'check_circle' : 'pending'}</span>
                                            {visit.status === 'Completed' ? 'COMPLETADA' : 'EN PROGRESO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[#637588] dark:text-[#94a3b8] text-base font-normal">
                                            <strong>Tipo:</strong> {visit.type}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                                            Supervisor: {visit.supervisorName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {visit.status !== 'Completed' && (
                                        <Link to={`/perform-visit/${visit.id}`} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg h-10 px-5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-md transition-all">
                                            <span className="material-symbols-outlined text-[20px]">play_circle</span>
                                            <span>Retomar Visita</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Title Section (PDF/Print Only - Formal) */}
                        <div className={`${isGenerating ? 'block' : 'hidden print:block'} mb-4`}>
                            <div className="border border-black bg-gray-100 p-2 mb-4 text-center font-bold text-sm uppercase">
                                Información General de la Visita
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border border-black p-4">
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">Cliente:</strong> <span>{visit.clientName}</span>
                                </div>
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">NIT / ID:</strong> <span>{visit.clientNit || visit.clientId}</span>
                                </div>
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">Fecha Programada:</strong> <span>{visit.date}</span>
                                </div>
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">Ejecución Real:</strong> <span>{formatDateTime(visit.completedAt)}</span>
                                </div>
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">Tipo Visita:</strong> <span>{visit.type}</span>
                                </div>
                                <div className="flex border-b border-gray-300 pb-1">
                                    <strong className="w-32">Supervisor:</strong> <span>{visit.supervisorName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:grid-cols-1 print:gap-4 print:block">
                            <div className="lg:col-span-2 flex flex-col gap-6 print:gap-4">

                                {/* Resumen */}
                                <section className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e7eb] dark:border-[#2a3b4d] overflow-hidden shadow-sm ${isGenerating ? 'border-black rounded-none shadow-none mb-4' : 'print:shadow-none print:border print:border-black print:rounded-none'}`}>
                                    <div className={`px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3b4d] flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 font-bold ${isGenerating ? 'bg-gray-100 border-black py-2' : 'print:bg-gray-100 print:border-black print:py-2'}`}>
                                        <h3 className={`text-[#111418] dark:text-white text-lg font-bold flex items-center gap-2 ${isGenerating ? 'text-black text-sm uppercase' : 'print:text-black print:text-base'}`}>
                                            {!isGenerating && <span className="material-symbols-outlined text-primary print:hidden">assignment</span>}
                                            Resumen de la Entrevista
                                        </h3>
                                    </div>
                                    <div className={`p-6 ${isGenerating ? 'p-4 text-xs' : 'print:p-4'}`}>
                                        {visit.interviewSummary ? (
                                            <p className={`text-[#111418] dark:text-[#e2e8f0] text-sm leading-relaxed mb-0 whitespace-pre-line text-justify ${isGenerating ? 'text-black text-xs' : 'print:text-black'}`}>
                                                {visit.interviewSummary}
                                            </p>
                                        ) : (
                                            <p className="text-slate-400 italic text-sm">No se registró resumen.</p>
                                        )}
                                    </div>
                                </section>

                                {/* Hallazgos */}
                                <section className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e7eb] dark:border-[#2a3b4d] overflow-hidden shadow-sm ${isGenerating ? 'border-black rounded-none shadow-none mb-4' : 'print:shadow-none print:border print:border-black print:rounded-none print:break-inside-avoid'}`}>
                                    <div className={`px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3b4d] bg-slate-50/50 dark:bg-slate-800/30 font-bold ${isGenerating ? 'bg-gray-100 border-black py-2' : 'print:bg-gray-100 print:border-black print:py-2'}`}>
                                        <h3 className={`text-[#111418] dark:text-white text-lg font-bold flex items-center gap-2 ${isGenerating ? 'text-black text-sm uppercase' : 'print:text-black print:text-base'}`}>
                                            {!isGenerating && <span className="material-symbols-outlined text-amber-500 fill print:hidden">warning</span>}
                                            Hallazgos y Observaciones
                                        </h3>
                                    </div>
                                    <div className="p-0">
                                        {visit.observations && visit.observations.length > 0 ? (
                                            visit.observations.map((obs, idx) => (
                                                <div key={idx} className={`flex items-start gap-4 p-6 border-b border-[#e5e7eb] dark:border-[#2a3b4d] last:border-0 ${isGenerating ? 'border-black p-2 gap-2' : 'print:border-black print:p-3 print:gap-2'}`}>
                                                    <div className={`rounded-lg p-2 shrink-0 ${obs.severity === 'High' ? 'bg-red-100 text-red-600' : obs.severity === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} ${isGenerating ? 'bg-transparent text-black p-0 border border-black px-1 h-auto font-bold' : 'print:bg-transparent print:text-black print:p-0 print:border print:border-black print:px-1'}`}>
                                                        {!isGenerating && (
                                                            <span className="material-symbols-outlined print:hidden">
                                                                {obs.severity === 'High' ? 'error' : 'info'}
                                                            </span>
                                                        )}
                                                        <span className={`hidden font-bold text-xs uppercase ${isGenerating ? 'inline' : 'print:inline'}`}>
                                                            {obs.severity === 'High' ? 'ALTA' : obs.severity === 'Medium' ? 'MEDIA' : 'BAJA'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className={`text-[#111418] dark:text-white font-bold text-sm mb-1 ${isGenerating ? 'text-black text-xs' : 'print:text-black'}`}>{obs.title}</h4>
                                                        {!isGenerating && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${obs.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} print:hidden`}>
                                                                Prioridad {obs.severity === 'High' ? 'Alta' : obs.severity === 'Medium' ? 'Media' : 'Baja'}
                                                            </span>
                                                        )}
                                                        <p className={`text-sm text-slate-500 mt-1 ${isGenerating ? 'text-black mt-0 text-xs' : 'print:text-black print:mt-0'}`}>{obs.description}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-slate-400 italic text-sm">No se registraron observaciones.</div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="flex flex-col gap-6 print:gap-4 print:break-inside-avoid print:mt-4 font-bold">
                                {/* Datos Generales (Solo pantalla, en PDF ya está en el header) */}
                                {!isGenerating && (
                                    <section className="bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e7eb] dark:border-[#2a3b4d] overflow-hidden shadow-sm print:hidden">
                                        <div className="px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3b4d] bg-slate-50/50 dark:bg-slate-800/30 print:bg-gray-100 print:border-black print:py-2">
                                            <h3 className="font-bold text-lg dark:text-white print:text-black print:text-base">Datos Generales</h3>
                                        </div>
                                        <div className="p-6 flex flex-col gap-5 print:p-4 print:gap-2">
                                            <div className="flex items-start gap-3 print:gap-2">
                                                <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-[#637588] dark:text-[#94a3b8] print:hidden">
                                                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[#637588] dark:text-[#94a3b8] uppercase tracking-wide mb-1 print:text-black">Fecha Programada</p>
                                                    <p className="text-[#111418] dark:text-white text-sm print:text-black">{visit.date}</p>
                                                </div>
                                            </div>
                                            {visit.completedAt && (
                                                <div className="flex items-start gap-3 print:gap-2">
                                                    <div className="mt-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-[#637588] dark:text-[#94a3b8] print:hidden">
                                                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-[#637588] dark:text-[#94a3b8] uppercase tracking-wide mb-1 print:text-black">Ejecución Real</p>
                                                        <p className="text-[#111418] dark:text-white text-sm print:text-black font-mono">{formatDateTime(visit.completedAt)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {visit.notes && (
                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs rounded border border-amber-100 dark:border-amber-800 print:bg-transparent print:text-black print:border-black print:border-t print:rounded-none print:mt-2">
                                                    <span className="font-bold block mb-1">Notas Iniciales:</span>
                                                    {visit.notes}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                <section className={`bg-surface-light dark:bg-surface-dark rounded-xl border border-[#e5e7eb] dark:border-[#2a3b4d] overflow-hidden shadow-sm p-6 ${isGenerating ? 'border-black rounded-none shadow-none p-4' : 'print:shadow-none print:border print:border-black print:rounded-none print:break-inside-avoid'}`}>
                                    <h3 className={`font-bold text-lg dark:text-white mb-4 ${isGenerating ? 'text-black text-sm uppercase border-b border-black pb-2' : 'print:text-black print:text-base print:border-b print:border-black print:pb-2'}`}>Evidencia Fotográfica</h3>
                                    <div className={`grid grid-cols-2 gap-2 ${isGenerating ? 'grid-cols-3' : 'print:grid-cols-2'}`}>
                                        {visit.photos && visit.photos.length > 0 ? (
                                            visit.photos.map((photo, i) => (
                                                <div key={i} className={`aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden ${isGenerating ? 'border border-black rounded-none shadow-none' : 'print:border print:border-black print:rounded-none'}`}>
                                                    <img src={photo} className={`w-full h-full object-cover ${!isGenerating ? 'hover:scale-110 transition-all duration-300' : ''} ${isGenerating ? 'object-contain bg-white' : 'print:object-contain print:bg-white'}`} />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="col-span-2 text-sm text-slate-400 italic">No hay fotos adjuntas.</p>
                                        )}
                                    </div>
                                </section>

                                {/* Print/PDF Footer Signature Area */}
                                <div className={`${isGenerating ? 'block mt-8' : 'hidden print:block mt-8'} pt-8 break-inside-avoid`}>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="border-t border-black pt-2 text-center text-xs">
                                            <p className="font-bold uppercase">Firma Supervisor</p>
                                            <p className="mt-1">{visit.supervisorName}</p>
                                        </div>
                                        <div className="border-t border-black pt-2 text-center text-xs">
                                            <p className="font-bold uppercase">Firma / Sello Cliente</p>
                                            <p className="mt-1">{visit.clientName}</p>
                                        </div>
                                    </div>
                                    <div className="mt-8 text-[10px] text-center text-gray-500 border-t border-gray-300 pt-2">
                                        <p>Documento generado electrónicamente por Supervisión Operativa App.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default VisitDetails;