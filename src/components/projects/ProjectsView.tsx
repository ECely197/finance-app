import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsData } from '../../hooks/useProjectsData';
import { useAppStore } from '../../store/useAppStore';
import { createProject, deleteProject, createTask, updateTask, deleteTask, completeTaskWithRecurrence } from '../../lib/firestore';
import { CheckSquare, Plus, Trash2, Circle, CheckCircle, ChevronDown, ChevronUp, Clock, Settings, Repeat } from 'lucide-react';

export const ProjectsView = ({ hideHeader = false }: { hideHeader?: boolean }) => {
   const { user, currentProfile } = useAppStore();
   const { projects, loading } = useProjectsData();

   const [showModal, setShowModal] = useState(false);
   const [titulo, setTitulo] = useState('');
   const [fechaLimite, setFechaLimite] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);

   const [expandedProject, setExpandedProject] = useState<string | null>(null);
   const [newTaskTitle, setNewTaskTitle] = useState('');

   // Task Options Modal State
   const [showTaskOptionsFor, setShowTaskOptionsFor] = useState<string | null>(null); // projectId
   const [taskDraftTitle, setTaskDraftTitle] = useState('');
   const [taskDueDate, setTaskDueDate] = useState('');
   const [taskTimeOfDay, setTaskTimeOfDay] = useState('');
   const [isRecurring, setIsRecurring] = useState(false);
   const [recurrenceType, setRecurrenceType] = useState('daily');

   const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !currentProfile || !titulo.trim()) return;
      setIsSubmitting(true);
      try {
         await createProject(user.uid, currentProfile.id, {
            titulo: titulo.trim(),
            fechaLimite: fechaLimite ? new Date(fechaLimite + 'T23:59:59') : null,
            fechaInicio: new Date(),
            createdAt: new Date(),
            estado: 'todo'
         });
         setTitulo('');
         setFechaLimite('');
         setShowModal(false);
      } catch (err) { console.error(err); } 
      finally { setIsSubmitting(false); }
   };

   const handleDeleteProject = async (id: string) => {
      if (!user || !currentProfile) return;
      if (!window.confirm("¿Confirma eliminar este proyecto y todas sus tareas?")) return;
      await deleteProject(user.uid, currentProfile.id, id);
   };

   const handleCreateTask = async (projectId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
       if (e.key === 'Enter' && newTaskTitle.trim()) {
           if (!user || !currentProfile) return;
           const titleCopy = newTaskTitle.trim();
           setNewTaskTitle('');
           await createTask(user.uid, currentProfile.id, projectId, {
               titulo: titleCopy,
               isCompleted: false,
               createdAt: new Date(),
               isRecurring: false
           });
       }
   };

   const handleCreateAdvancedTask = async (e: React.FormEvent) => {
       e.preventDefault();
       if (!user || !currentProfile || !showTaskOptionsFor || !taskDraftTitle.trim()) return;
       setIsSubmitting(true);
       try {
           await createTask(user.uid, currentProfile.id, showTaskOptionsFor, {
               titulo: taskDraftTitle.trim(),
               isCompleted: false,
               createdAt: new Date(),
               dueDate: taskDueDate ? new Date(taskDueDate + 'T23:59:59') : null,
               timeOfDay: taskTimeOfDay || null,
               isRecurring,
               recurrenceType: isRecurring ? recurrenceType : null
           });
           setShowTaskOptionsFor(null);
           setTaskDraftTitle('');
           setTaskDueDate('');
           setTaskTimeOfDay('');
           setIsRecurring(false);
       } catch (err) { console.error(err) }
       finally { setIsSubmitting(false); }
   };

   const handleToggleTask = async (projectId: string, task: any) => {
       if (!user || !currentProfile) return;
       if (!task.isCompleted) {
            // Task is being marked AS completed - run recurrence logic
            await completeTaskWithRecurrence(user.uid, currentProfile.id, projectId, task);
       } else {
            // Task is being UNMARKED, just update locally
            await updateTask(user.uid, currentProfile.id, projectId, task.id, { isCompleted: false });
       }
   };

   const handleDeleteTask = async (projectId: string, taskId: string) => {
       if (!user || !currentProfile) return;
       await deleteTask(user.uid, currentProfile.id, projectId, taskId);
   };

   const containerVariants: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
   const itemVariants: any = { hidden: { opacity: 0, scale: 0.96, y: 12 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } } };

   return (
     <div className="w-full max-w-4xl mx-auto space-y-6 pb-28 sm:pb-24">
      {!hideHeader && (
        <div className="pt-2 sm:pt-6 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Proyectos y Tareas</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestión ágil de pendientes en <b className="text-slate-700 dark:text-slate-200">{currentProfile?.name}</b></p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#0381FE] hover:bg-[#0270df] text-white px-5 py-3 rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">
             <Plus size={18} strokeWidth={2.5}/> Nuevo Proyecto
          </button>
        </div>
      )}

        {/* Add new project button when in modal context */}
        {hideHeader && (
          <motion.button 
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="w-full py-4 sm:py-5 rounded-[28px] bg-white dark:bg-[#17171A] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border-none dark:border dark:border-white/5 transition-all group flex items-center justify-center gap-3 mb-6 active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-[18px] bg-[#0381FE]/15 flex items-center justify-center text-[#0381FE] dark:text-[#387AFF] transition-colors">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#0381FE] dark:group-hover:text-[#387AFF] uppercase tracking-widest transition-colors">
              Nuevo Proyecto o Hábito
            </span>
          </motion.button>
        )}

       {loading ? (
         <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-[#0381FE] rounded-full animate-spin" />
         </div>
       ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-[#17171A] border border-dashed border-slate-200 dark:border-white/10 rounded-[28px] p-12 text-center shadow-sm flex flex-col items-center mt-6">
             <div className="w-20 h-20 bg-slate-100 dark:bg-[#1C1C1E] text-slate-400 rounded-3xl flex items-center justify-center mb-6">
                <CheckSquare size={36} strokeWidth={2} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No tienes proyectos en curso</h3>
             <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium leading-relaxed mb-8">
                Crea un proyecto para empezar a añadir tareas que necesites completar para lograr tus objetivos. Las tareas más urgentes siempre destacarán.
             </p>
             <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#0381FE] hover:bg-[#0270df] text-white px-6 py-3.5 rounded-full font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                <Plus size={18} strokeWidth={2.5}/> Añadir primer proyecto
             </button>
          </div>
       ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 mt-6">
             {projects.map(proj => {
                const isCompleted = proj.progress === 100 && proj.tasks.length > 0;
                const isExpanded = expandedProject === proj.id;
                
                let statusText = isCompleted ? 'text-emerald-500' : 'text-[#0381FE]';
                let statusBg = isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-blue-50 dark:bg-blue-950/30';
                
                if (!isCompleted) {
                   const fInicio = proj.fechaInicio?.toDate ? proj.fechaInicio.toDate() : new Date();
                   const fLimit = proj.fechaLimite?.toDate ? proj.fechaLimite.toDate() : new Date();
                   const daysTotal = Math.max(Math.ceil((fLimit.getTime() - fInicio.getTime()) / (1000*60*60*24)), 1);
                   const percentTimeLeft = (proj.daysRemaining / daysTotal) * 100;
                   if (proj.daysRemaining <= 2) {
                       statusText = 'text-rose-600 dark:text-rose-400'; statusBg = 'bg-rose-50 dark:bg-rose-950/30';
                   } else if (percentTimeLeft < 30) {
                       statusText = 'text-amber-600 dark:text-amber-400'; statusBg = 'bg-amber-50 dark:bg-amber-950/30';
                   }
                }

                return (
                   <motion.div 
                      key={proj.id} 
                      variants={itemVariants}
                      className={`bg-white dark:bg-[#17171A] rounded-[28px] border border-black/5 dark:border-white/5 transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-[#0381FE]/30 shadow-md' : 'shadow-sm'}`}
                   >
                      <div 
                         className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                         onClick={() => setExpandedProject(isExpanded ? null : proj.id as string)}
                      >
                         <div className="flex-1 flex items-center gap-5">
                            <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
                               <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 36 36">
                                  <path className="text-slate-100 dark:text-zinc-800" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className={statusText} strokeDasharray={`${proj.progress}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 1s ease' }} />
                               </svg>
                               <span className="text-[10px] font-black text-slate-800 dark:text-white">{proj.progress.toFixed(0)}%</span>
                            </div>
                            
                            <div>
                               <h3 className={`text-lg font-extrabold line-clamp-1 ${isCompleted ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-900 dark:text-white'}`}>{proj.titulo}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                  {proj.fechaLimite ? (
                                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusBg} ${statusText}`}>
                                         {isCompleted ? 'Finalizado' : proj.daysRemaining <= 0 ? 'Atrasado/Vence' : `Faltan ${proj.daysRemaining}d`}
                                      </span>
                                  ) : (
                                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400">Continuo</span>
                                  )}
                                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-400 flex items-center gap-1"><CheckSquare size={12}/> {proj.tasks.filter(t=>t.isCompleted).length}/{proj.tasks.length} tareas</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                               onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id as string); }}
                               className="p-2 text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-colors shrink-0"
                            >
                               <Trash2 size={16} strokeWidth={2.5}/>
                            </button>
                            <div className="p-2 text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-[#1C1C1E] rounded-full">
                               {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                         </div>
                      </div>

                      <AnimatePresence>
                         {isExpanded && (
                            <motion.div 
                               initial={{ height: 0, opacity: 0 }} 
                               animate={{ height: 'auto', opacity: 1 }} 
                               exit={{ height: 0, opacity: 0 }}
                               className="border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"
                            >
                               <div className="p-6 pt-4 space-y-2">
                                  {proj.tasks.map(task => (
                                     <div key={task.id} className={`flex items-center justify-between p-3.5 rounded-[18px] border transition-colors group ${task.isCompleted ? 'bg-white dark:bg-[#17171A] border-emerald-200 dark:border-emerald-800/40' : 'bg-white dark:bg-[#17171A] border-black/5 dark:border-white/5 hover:border-[#0381FE]/40'}`}>
                                         <div 
                                            className="flex items-center gap-3 cursor-pointer flex-1"
                                            onClick={() => handleToggleTask(proj.id as string, task)}
                                         >
                                            <div className={task.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-zinc-600 group-hover:text-[#0381FE]'}>
                                               {task.isCompleted ? <CheckCircle size={20} strokeWidth={2.5}/> : <Circle size={20} strokeWidth={2.5}/>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-sm ${task.isCompleted ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-800 dark:text-zinc-100'}`}>{task.titulo}</span>
                                                {(task.timeOfDay || task.isRecurring) && (
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-widest">
                                                        {task.timeOfDay && <span className="flex items-center gap-0.5"><Clock size={10} /> {task.timeOfDay}</span>}
                                                        {task.isRecurring && <span className="flex items-center gap-0.5 text-[#0381FE]"><Repeat size={10} strokeWidth={3}/> {task.recurrenceType}</span>}
                                                    </div>
                                                )}
                                            </div>
                                         </div>
                                        <button 
                                            onClick={() => handleDeleteTask(proj.id as string, task.id)}
                                            className="p-1.5 text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 size={14} strokeWidth={2.5}/>
                                        </button>
                                     </div>
                                  ))}
                                  
                                  <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                                     <div className="relative flex-1">
                                         <Plus size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" strokeWidth={3}/>
                                         <input 
                                            type="text" 
                                            placeholder="Añadir tarea rápida (Enter)..."
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            onKeyDown={(e) => handleCreateTask(proj.id as string, e)}
                                            className="w-full bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-inner"
                                         />
                                     </div>
                                     <button 
                                        onClick={() => setShowTaskOptionsFor(showTaskOptionsFor === proj.id ? null : proj.id as string)}
                                        className={`p-3 rounded-2xl border transition-all active:scale-95 ${showTaskOptionsFor === proj.id ? 'bg-[#0381FE]/15 border-[#0381FE]/30 text-[#0381FE]' : 'bg-white dark:bg-[#1C1C1E] border-black/5 dark:border-white/10 text-slate-400 dark:text-zinc-400 hover:text-[#0381FE]'}`}
                                        title="Opciones Avanzadas (Hábito/Rutina)"
                                     >
                                         <Settings size={18} strokeWidth={2.5}/>
                                     </button>
                                  </div>
                               </div>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </motion.div>
                );
             })}
          </motion.div>
       )}

       {/* Modal Nuevo Proyecto - One UI 9.0 Bottom Sheet */}
       <AnimatePresence>
          {showModal && (
             <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                <motion.div 
                   initial={{ opacity: 0, y: 40, scale: 0.98 }} 
                   animate={{ opacity: 1, y: 0, scale: 1 }} 
                   exit={{ opacity: 0, y: 40, scale: 0.98 }} 
                   transition={{ type: "spring", stiffness: 380, damping: 30 }}
                   className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden z-10 p-6 sm:p-8 border border-white/20 dark:border-white/5"
                >
                   {/* One UI Drag handle indicator */}
                   <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />
                   
                   <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Nuevo Proyecto / Hito</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-6">Una vez creado, agrupa las tareas necesarias para cumplirlo.</p>

                   <form onSubmit={handleCreateProject} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Nombre del Proyecto</label>
                        <input 
                           type="text" 
                           required 
                           value={titulo} 
                           onChange={e => setTitulo(e.target.value)} 
                           placeholder="Ej. Lanzamiento Nuevo Producto..." 
                           className="w-full px-4 py-3.5 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Fecha Estimada de Entrega (Opcional)</label>
                        <input 
                           type="date" 
                           value={fechaLimite} 
                           onChange={e => setFechaLimite(e.target.value)} 
                           className="w-full px-4 py-3.5 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all font-bold text-slate-800 dark:text-white cursor-pointer" 
                        />
                      </div>

                      <div className="pt-4 flex gap-3">
                         <button 
                            type="button" 
                            onClick={() => setShowModal(false)} 
                            disabled={isSubmitting} 
                            className="flex-1 py-4 px-4 bg-slate-100 dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-2xl transition-all active:scale-[0.98]"
                         >
                            Cancelar
                         </button>
                         <button 
                            type="submit" 
                            disabled={isSubmitting || !titulo.trim()} 
                            className="flex-[2] flex items-center justify-center gap-2 py-4 px-4 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
                         >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Crear Proyecto'}
                         </button>
                      </div>
                   </form>
                </motion.div>
             </div>
           )}
       </AnimatePresence>

       {/* Modal Avanzado de Tarea / Hábito - One UI 9.0 Bottom Sheet */}
       <AnimatePresence>
          {showTaskOptionsFor && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setShowTaskOptionsFor(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                <motion.div 
                   initial={{ opacity: 0, y: 40, scale: 0.98 }} 
                   animate={{ opacity: 1, y: 0, scale: 1 }} 
                   exit={{ opacity: 0, y: 40, scale: 0.98 }} 
                   transition={{ type: "spring", stiffness: 380, damping: 30 }}
                   className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden z-10 p-6 sm:p-8 border border-white/20 dark:border-white/5"
                >
                   {/* One UI Drag handle indicator */}
                   <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />
                   
                   <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Nueva Tarea o Hábito</h3>
                   <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-6">Configura tareas repetitivas o asignales una hora específica.</p>

                   <form onSubmit={handleCreateAdvancedTask} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Título</label>
                        <input 
                           type="text" 
                           required 
                           value={taskDraftTitle} 
                           onChange={e => setTaskDraftTitle(e.target.value)} 
                           placeholder="Ej. Leer 10 páginas..." 
                           className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500" 
                        />
                      </div>
                      
                      <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Fecha (Opc.)</label>
                            <input 
                               type="date" 
                               value={taskDueDate} 
                               onChange={e => setTaskDueDate(e.target.value)} 
                               className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] font-bold text-slate-800 dark:text-white text-sm" 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-2 uppercase tracking-widest">Hora (Opc.)</label>
                            <input 
                               type="time" 
                               value={taskTimeOfDay} 
                               onChange={e => setTaskTimeOfDay(e.target.value)} 
                               className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] font-bold text-slate-800 dark:text-white text-sm" 
                            />
                          </div>
                      </div>

                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                          <label className="text-sm font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer">
                              <input 
                                 type="checkbox" 
                                 checked={isRecurring} 
                                 onChange={(e) => setIsRecurring(e.target.checked)} 
                                 className="w-5 h-5 rounded-lg text-[#0381FE] focus:ring-[#0381FE] border-slate-300 dark:border-zinc-700 dark:bg-[#1C1C1E]" 
                              />
                              Es un hábito repetitivo
                          </label>
                      </div>

                      <AnimatePresence>
                         {isRecurring && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                               <label className="block text-[11px] font-black text-[#0381FE] mb-2 uppercase tracking-widest mt-2">¿Cada cuánto se repite?</label>
                               <select 
                                  value={recurrenceType} 
                                  onChange={e => setRecurrenceType(e.target.value)} 
                                  className="w-full px-4 py-3 bg-[#0381FE]/10 border border-[#0381FE]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] font-bold text-[#0381FE] text-sm"
                               >
                                  <option value="daily" className="bg-white dark:bg-[#17171A] text-slate-800 dark:text-white">Diariamente</option>
                                  <option value="weekly" className="bg-white dark:bg-[#17171A] text-slate-800 dark:text-white">Semanalmente</option>
                                  <option value="monthly" className="bg-white dark:bg-[#17171A] text-slate-800 dark:text-white">Mensualmente</option>
                               </select>
                            </motion.div>
                         )}
                      </AnimatePresence>

                      <div className="pt-4 flex gap-3">
                         <button 
                            type="button" 
                            onClick={() => setShowTaskOptionsFor(null)} 
                            disabled={isSubmitting} 
                            className="py-3.5 px-4 bg-slate-100 dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-2xl transition-all active:scale-[0.98]"
                         >
                            Cancelar
                         </button>
                         <button 
                            type="submit" 
                            disabled={isSubmitting || !taskDraftTitle.trim()} 
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
                         >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Guardar Tarea'}
                         </button>
                      </div>
                   </form>
                </motion.div>
            </div>
          )}
       </AnimatePresence>
     </div>
   );
};
