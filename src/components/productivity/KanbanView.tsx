import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsData, type Project } from '../../hooks/useProjectsData';
import { useAppStore } from '../../store/useAppStore';
import { updateProject } from '../../lib/firestore';
import { useNotesData } from '../../hooks/useNotesData';
import { ArrowRight, ArrowLeft, Clock, Calendar, CheckCircle2, Circle, Loader2, BookText } from 'lucide-react';

export const KanbanView = () => {
    const { user, currentProfile, setWorkspaceActiveTab, setSelectedNoteId } = useAppStore();
    const { projects, loading } = useProjectsData();
    const { notes } = useNotesData();

    const todoProjects = projects.filter(p => !p.estado || p.estado === 'todo');
    const progressProjects = projects.filter(p => p.estado === 'progress');
    const doneProjects = projects.filter(p => p.estado === 'done');

    const handleMove = async (project: Project, newStatus: 'todo' | 'progress' | 'done') => {
        if (!user || !currentProfile || !project.id) return;
        try {
            await updateProject(user.uid, currentProfile.id, project.id, { estado: newStatus });
        } catch (error) {
            console.error("Error updating project status", error);
        }
    };

    const formatDateInfo = (project: Project) => {
        if (!project.fechaLimite) return { text: 'Sin fecha', color: 'text-slate-400 dark:text-zinc-500', bg: 'bg-slate-100 dark:bg-white/5' };
        
        const fLimit = project.fechaLimite?.toDate ? project.fechaLimite.toDate() : new Date(project.fechaLimite);
        const now = new Date();
        now.setHours(0,0,0,0);
        const limitD = new Date(fLimit);
        limitD.setHours(23,59,59,999);
        
        const isPast = now.getTime() > limitD.getTime();
        const daysDiff = Math.ceil((limitD.getTime() - now.getTime()) / (1000*60*60*24));

        if (isPast) return { text: `Venció hace ${Math.abs(daysDiff)}d`, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' };
        if (daysDiff === 0) return { text: 'Vence Hoy', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' };
        if (daysDiff <= 2) return { text: `Vence en ${daysDiff}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' };
        
        return { 
            text: limitD.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), 
            color: 'text-slate-500 dark:text-zinc-400', 
            bg: 'bg-slate-100 dark:bg-white/5' 
        };
    };

    const renderCard = (project: Project) => {
        const dateInfo = formatDateInfo(project);
        
        return (
            <motion.div 
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-[24px] p-4.5 shadow-sm border border-black/5 dark:border-white/5 group hover:shadow-md transition-all active:scale-[0.98]"
            >
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug">{project.titulo}</h4>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 ${dateInfo.bg} ${dateInfo.color}`}>
                        {dateInfo.color.includes('rose') ? <Clock size={12} strokeWidth={3} /> : <Calendar size={12} strokeWidth={2.5} />}
                        {dateInfo.text}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 mb-1.5">
                        <span>Progreso Tareas</span>
                        <span className="text-slate-700 dark:text-zinc-300">{Math.round(project.progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-[#0381FE]'}`}
                            style={{ width: `${project.progress}%` }}
                        />
                    </div>
                </div>

                {/* Action Buttons & Note Link */}
                <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                    
                    {(() => {
                        const linkedNote = notes.find(n => n.linkedProjectId === project.id);
                        if (!linkedNote) return null;
                        return (
                            <button 
                                onClick={() => {
                                    setWorkspaceActiveTab('notes');
                                    setSelectedNoteId(linkedNote.id);
                                }}
                                className="w-8 h-8 flex shrink-0 items-center justify-center text-[#0381FE] bg-[#0381FE]/10 hover:bg-[#0381FE]/20 rounded-full transition-colors border border-[#0381FE]/20"
                                title="Abrir Nota Vinculada"
                            >
                                <BookText size={14} />
                            </button>
                        );
                    })()}

                    {(!project.estado || project.estado === 'todo') && (
                        <button 
                            onClick={() => handleMove(project, 'progress')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#0381FE] bg-[#0381FE]/10 hover:bg-[#0381FE]/20 rounded-full transition-all active:scale-95"
                        >
                            Empezar <ArrowRight size={14} />
                        </button>
                    )}
                    {project.estado === 'progress' && (
                        <>
                            <button 
                                onClick={() => handleMove(project, 'todo')}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <ArrowLeft size={14} />
                            </button>
                            <button 
                                onClick={() => handleMove(project, 'done')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 rounded-full transition-all active:scale-95"
                            >
                                Completar <CheckCircle2 size={14} />
                            </button>
                        </>
                    )}
                    {project.estado === 'done' && (
                        <button 
                            onClick={() => handleMove(project, 'progress')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 rounded-full transition-all active:scale-95"
                        >
                            <ArrowLeft size={14} /> Volver a Progreso
                        </button>
                    )}
                </div>
            </motion.div>
        );
    };

    if (loading && projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-zinc-600 gap-3">
                <Loader2 size={32} className="animate-spin text-[#0381FE]" />
                <p className="font-bold">Cargando tablero...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-2 md:p-6 custom-scrollbar overflow-x-auto items-start">
            
            {/* Column 1: TODO */}
            <div className="bg-slate-100/70 dark:bg-[#17171A] border border-black/5 dark:border-white/5 rounded-[28px] p-4.5 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Circle size={16} strokeWidth={3} className="text-slate-400 dark:text-zinc-500" />
                        <h3 className="font-black text-slate-800 dark:text-white">Por Hacer</h3>
                    </div>
                    <span className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-slate-500 dark:text-zinc-400 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {todoProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {todoProjects.map(renderCard)}
                    </AnimatePresence>
                    {todoProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-slate-400 dark:text-zinc-500 border border-dashed border-black/10 dark:border-white/10 rounded-[20px]">
                            No tienes proyectos pendientes
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: IN PROGRESS */}
            <div className="bg-[#0381FE]/5 dark:bg-[#0381FE]/10 border border-[#0381FE]/15 rounded-[28px] p-4.5 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Loader2 size={16} strokeWidth={3} className="text-[#0381FE]" />
                        <h3 className="font-black text-slate-800 dark:text-white">En Progreso</h3>
                    </div>
                    <span className="bg-white dark:bg-[#1C1C1E] border border-[#0381FE]/20 text-[#0381FE] text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {progressProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {progressProjects.map(renderCard)}
                    </AnimatePresence>
                    {progressProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-slate-400 dark:text-zinc-500 border border-dashed border-[#0381FE]/20 rounded-[20px]">
                            No hay nada en progreso
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: DONE */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15 rounded-[28px] p-4.5 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} strokeWidth={3} className="text-emerald-500" />
                        <h3 className="font-black text-slate-800 dark:text-white">Completados</h3>
                    </div>
                    <span className="bg-white dark:bg-[#1C1C1E] border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {doneProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {doneProjects.map(renderCard)}
                    </AnimatePresence>
                    {doneProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-emerald-600/50 dark:text-emerald-400/50 border border-dashed border-emerald-500/20 rounded-[20px]">
                            Aún no has completado proyectos
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
