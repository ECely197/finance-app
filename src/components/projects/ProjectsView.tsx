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
            createdAt: new Date()
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

   const containerVariants: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
   const itemVariants: any = { hidden: { opacity: 0, scale: 0.95, y: 15 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

   return (
     <div className="w-full max-w-4xl mx-auto space-y-6 pb-24">
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Proyectos y Tareas</h2>
            <p className="text-slate-500 font-medium mt-1">Gesti&oacute;n ágil de pendientes en <b>{currentProfile?.name}</b></p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95">
             <Plus size={18} strokeWidth={2.5}/> Nuevo Proyecto
          </button>
        </div>
      )}

       {/* Add new project button when in modal context */}
       {hideHeader && (
         <motion.button 
           whileHover={{ scale: 1.01 }}
           whileTap={{ scale: 0.99 }}
           onClick={() => setShowModal(true)}
           className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group flex flex-col items-center justify-center gap-2 mb-4"
         >
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
               <Plus size={20} strokeWidth={3} />
            </div>
            <span className="text-sm font-black text-slate-600 group-hover:text-blue-600 uppercase tracking-widest">Nuevo Proyecto o Hábito</span>
         </motion.button>
       )}

       {loading ? (
         <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
         </div>
       ) : projects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center shadow-sm flex flex-col items-center mt-6">
             <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-3xl flex items-center justify-center mb-6">
                <CheckSquare size={36} strokeWidth={2} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">No tienes proyectos en curso</h3>
             <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-8">
                Crea un proyecto para empezar a añadir tareas que necesites completar para lograr tus objetivos. Las tareas más urgentes siempre destacarán.
             </p>
             <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm">
                <Plus size={18} strokeWidth={2.5}/> Añadir primer proyecto
             </button>
          </div>
       ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 mt-6">
             {projects.map(proj => {
                const isCompleted = proj.progress === 100 && proj.tasks.length > 0;
                const isExpanded = expandedProject === proj.id;
                
                let statusText = isCompleted ? 'text-emerald-500' : 'text-blue-500';
                let statusBg = isCompleted ? 'bg-emerald-50' : 'bg-slate-50';
                
                if (!isCompleted) {
                   const fInicio = proj.fechaInicio?.toDate ? proj.fechaInicio.toDate() : new Date();
                   const fLimit = proj.fechaLimite?.toDate ? proj.fechaLimite.toDate() : new Date();
                   const daysTotal = Math.max(Math.ceil((fLimit.getTime() - fInicio.getTime()) / (1000*60*60*24)), 1);
                   const percentTimeLeft = (proj.daysRemaining / daysTotal) * 100;
                   if (proj.daysRemaining <= 2) {
                       statusText = 'text-rose-600'; statusBg = 'bg-rose-50';
                   } else if (percentTimeLeft < 30) {
                       statusText = 'text-amber-600'; statusBg = 'bg-amber-50';
                   }
                }

                return (
                   <motion.div 
                      key={proj.id} 
                      variants={itemVariants}
                      className={`bg-white rounded-[2rem] shadow-[0_4px_30px_rgb(0,0,0,0.03)] border transition-all overflow-hidden ${isExpanded ? 'border-blue-100 shadow-blue-500/5' : 'border-slate-100'}`}
                   >
                      <div 
                         className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                         onClick={() => setExpandedProject(isExpanded ? null : proj.id as string)}
                      >
                         <div className="flex-1 flex items-center gap-5">
                            <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
                               <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 36 36">
                                  <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path className={statusText} strokeDasharray={`${proj.progress}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 1s ease' }} />
                               </svg>
                               <span className="text-[10px] font-black">{proj.progress.toFixed(0)}%</span>
                            </div>
                            
                            <div>
                               <h3 className={`text-lg font-extrabold line-clamp-1 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{proj.titulo}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                  {proj.fechaLimite ? (
                                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${statusBg} ${statusText}`}>
                                         {isCompleted ? 'Finalizado' : proj.daysRemaining <= 0 ? 'Atrasado/Vence' : `Faltan ${proj.daysRemaining}d`}
                                      </span>
                                  ) : (
                                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">Continuo</span>
                                  )}
                                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CheckSquare size={12}/> {proj.tasks.filter(t=>t.isCompleted).length}/{proj.tasks.length} tareas</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <button 
                               onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id as string); }}
                               className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                            >
                               <Trash2 size={16} strokeWidth={2.5}/>
                            </button>
                            <div className="p-2 text-slate-400 bg-slate-50 rounded-xl rounded-full">
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
                               className="border-t border-slate-100 bg-slate-50/50"
                            >
                               <div className="p-6 pt-4 space-y-2">
                                  {proj.tasks.map(task => (
                                     <div key={task.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${task.isCompleted ? 'bg-white border-emerald-100' : 'bg-white border-slate-100 hover:border-blue-100'}`}>
                                         <div 
                                            className="flex items-center gap-3 cursor-pointer flex-1"
                                            onClick={() => handleToggleTask(proj.id as string, task)}
                                         >
                                            <div className={task.isCompleted ? 'text-emerald-500' : 'text-slate-300 group-hover:text-blue-500'}>
                                               {task.isCompleted ? <CheckCircle size={20} strokeWidth={2.5}/> : <Circle size={20} strokeWidth={2.5}/>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.titulo}</span>
                                                {/* Task Meta indicators */}
                                                {(task.timeOfDay || task.isRecurring) && (
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {task.timeOfDay && <span className="flex items-center gap-0.5"><Clock size={10} /> {task.timeOfDay}</span>}
                                                        {task.isRecurring && <span className="flex items-center gap-0.5 text-blue-500"><Repeat size={10} strokeWidth={3}/> {task.recurrenceType}</span>}
                                                    </div>
                                                )}
                                            </div>
                                         </div>
                                        <button 
                                            onClick={() => handleDeleteTask(proj.id as string, task.id)}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-rose-50"
                                        >
                                            <Trash2 size={14} strokeWidth={2.5}/>
                                        </button>
                                     </div>
                                  ))}
                                  
                                  <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center gap-2">
                                     <div className="relative flex-1">
                                         <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={3}/>
                                         <input 
                                            type="text" 
                                            placeholder="Añadir tarea rápida (Enter)..."
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            onKeyDown={(e) => handleCreateTask(proj.id as string, e)}
                                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm"
                                         />
                                     </div>
                                     <button 
                                        onClick={() => setShowTaskOptionsFor(showTaskOptionsFor === proj.id ? null : proj.id as string)}
                                        className={`p-2.5 rounded-xl border transition-colors ${showTaskOptionsFor === proj.id ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200'}`}
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

       {/* Modal Nuevo Proyecto */}
       <AnimatePresence>
          {showModal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 p-8">
                   <h3 className="text-2xl font-extrabold text-slate-800 mb-2 mt-2">Nuevo Proyecto / Hito</h3>
                   <p className="text-slate-500 font-medium text-sm mb-8">Una vez creado, agrupa las tareas necesarias para cumplirlo.</p>

                   <form onSubmit={handleCreateProject} className="space-y-5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Nombre del Proyecto</label>
                        <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Lanzamiento Nuevo Producto..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fecha Estimada de Entrega (Opcional)</label>
                        <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 cursor-pointer" />
                      </div>

                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setShowModal(false)} disabled={isSubmitting} className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">Cancelar</button>
                         <button type="submit" disabled={isSubmitting || !titulo.trim()} className="flex-[2] flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-200 border-t-white rounded-full animate-spin" /> : 'Crear Proyecto'}
                         </button>
                      </div>
                   </form>
                </motion.div>
             </div>
           )}
       </AnimatePresence>

       {/* Modal Avanzado de Tarea / Hábito */}
       <AnimatePresence>
          {showTaskOptionsFor && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setShowTaskOptionsFor(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 p-8">
                   <h3 className="text-2xl font-extrabold text-slate-800 mb-2 mt-2">Nueva Tarea o Hábito</h3>
                   <p className="text-slate-500 font-medium text-sm mb-6">Configura tareas repetitivas o asignales una hora específica.</p>

                   <form onSubmit={handleCreateAdvancedTask} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Título</label>
                        <input type="text" required value={taskDraftTitle} onChange={e => setTaskDraftTitle(e.target.value)} placeholder="Ej. Leer 10 páginas..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700" />
                      </div>
                      
                      <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fecha (Opc.)</label>
                            <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Hora (Opc.)</label>
                            <input type="time" value={taskTimeOfDay} onChange={e => setTaskTimeOfDay(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700 text-sm" />
                          </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                              Es un hábito repetitivo
                          </label>
                      </div>

                      <AnimatePresence>
                         {isRecurring && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                               <label className="block text-[11px] font-black text-blue-500 mb-2 uppercase tracking-widest mt-2">¿Cada cuánto se repite?</label>
                               <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)} className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-blue-700 text-sm">
                                  <option value="daily">Diariamente</option>
                                  <option value="weekly">Semanalmente</option>
                                  <option value="monthly">Mensualmente</option>
                               </select>
                            </motion.div>
                         )}
                      </AnimatePresence>

                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setShowTaskOptionsFor(null)} disabled={isSubmitting} className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all">Cancelar</button>
                         <button type="submit" disabled={isSubmitting || !taskDraftTitle.trim()} className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-200 border-t-white rounded-full animate-spin" /> : 'Guardar Tarea'}
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
