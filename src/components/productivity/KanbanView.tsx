
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
        if (!project.fechaLimite) return { text: 'Sin fecha', color: 'text-slate-400', bg: 'bg-slate-100' };
        
        const fLimit = project.fechaLimite?.toDate ? project.fechaLimite.toDate() : new Date(project.fechaLimite);
        const now = new Date();
        now.setHours(0,0,0,0);
        const limitD = new Date(fLimit);
        limitD.setHours(23,59,59,999);
        
        const isPast = now.getTime() > limitD.getTime();
        const daysDiff = Math.ceil((limitD.getTime() - now.getTime()) / (1000*60*60*24));

        if (isPast) return { text: `Venció hace ${Math.abs(daysDiff)}d`, color: 'text-rose-600', bg: 'bg-rose-50' };
        if (daysDiff === 0) return { text: 'Vence Hoy', color: 'text-rose-600', bg: 'bg-rose-50' };
        if (daysDiff <= 2) return { text: `Vence en ${daysDiff}d`, color: 'text-amber-600', bg: 'bg-amber-50' };
        
        return { 
            text: limitD.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), 
            color: 'text-slate-500', 
            bg: 'bg-slate-100' 
        };
    };

    const renderCard = (project: Project) => {
        const dateInfo = formatDateInfo(project);
        
        return (
            <motion.div 
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow"
            >
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug">{project.titulo}</h4>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 ${dateInfo.bg} ${dateInfo.color}`}>
                        {dateInfo.color.includes('rose') ? <Clock size={12} strokeWidth={3} /> : <Calendar size={12} strokeWidth={2.5} />}
                        {dateInfo.text}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                        <span>Progreso Tareas</span>
                        <span>{Math.round(project.progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                            style={{ width: `${project.progress}%` }}
                        />
                    </div>
                </div>

                {/* Action Buttons & Note Link */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    
                    {(() => {
                        const linkedNote = notes.find(n => n.linkedProjectId === project.id);
                        if (!linkedNote) return null;
                        return (
                            <button 
                                onClick={() => {
                                    setWorkspaceActiveTab('notes');
                                    setSelectedNoteId(linkedNote.id);
                                }}
                                className="w-8 h-8 flex shrink-0 items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                title="Abrir Nota Vinculada"
                            >
                                <BookText size={14} />
                            </button>
                        );
                    })()}

                    {(!project.estado || project.estado === 'todo') && (
                        <button 
                            onClick={() => handleMove(project, 'progress')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                            Empezar <ArrowRight size={14} />
                        </button>
                    )}
                    {project.estado === 'progress' && (
                        <>
                            <button 
                                onClick={() => handleMove(project, 'todo')}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={14} />
                            </button>
                            <button 
                                onClick={() => handleMove(project, 'done')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                                Completar <CheckCircle2 size={14} />
                            </button>
                        </>
                    )}
                    {project.estado === 'done' && (
                        <button 
                            onClick={() => handleMove(project, 'progress')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
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
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Loader2 size={32} className="animate-spin text-blue-500" />
                <p className="font-bold">Cargando tablero...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-2 md:p-6 custom-scrollbar overflow-x-auto items-start">
            
            {/* Column 1: TODO */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-3xl p-4 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Circle size={16} strokeWidth={3} className="text-slate-400" />
                        <h3 className="font-black text-slate-700">Por Hacer</h3>
                    </div>
                    <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {todoProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {todoProjects.map(renderCard)}
                    </AnimatePresence>
                    {todoProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                            No tienes proyectos pendientes
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: IN PROGRESS */}
            <div className="bg-blue-50/30 border border-blue-50 rounded-3xl p-4 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Loader2 size={16} strokeWidth={3} className="text-blue-500" />
                        <h3 className="font-black text-slate-700">En Progreso</h3>
                    </div>
                    <span className="bg-white border border-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {progressProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {progressProjects.map(renderCard)}
                    </AnimatePresence>
                    {progressProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-slate-400 border-2 border-dashed border-blue-100 rounded-2xl">
                            No hay nada en progreso
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: DONE */}
            <div className="bg-emerald-50/30 border border-emerald-50 rounded-3xl p-4 w-full md:min-w-[320px] md:max-w-[350px] flex shrink-0 flex-col h-fit max-h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} strokeWidth={3} className="text-emerald-500" />
                        <h3 className="font-black text-slate-700">Completados</h3>
                    </div>
                    <span className="bg-white border border-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {doneProjects.length}
                    </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-4 px-1">
                    <AnimatePresence>
                        {doneProjects.map(renderCard)}
                    </AnimatePresence>
                    {doneProjects.length === 0 && (
                        <div className="p-8 text-center text-sm font-medium text-emerald-600/50 border-2 border-dashed border-emerald-100 rounded-2xl">
                            Aún no has completado proyectos
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
