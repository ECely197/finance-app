import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsData } from '../../hooks/useProjectsData';
import { updateTask, completeTaskWithRecurrence } from '../../lib/firestore';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle, Circle, ChevronDown, Flag } from 'lucide-react';

export const GlobalTaskTicker = () => {
   const { projects } = useProjectsData();
   const { user, currentProfile } = useAppStore();
   const [isExpanded, setIsExpanded] = useState(false);

   if (!projects || projects.length === 0) return null;

   const activeProjects = projects.filter(p => p.progress < 100);
   if (activeProjects.length === 0) return null;

   const topProject = activeProjects[0];
   const uncompletedTasks = topProject.tasks.filter(t => !t.isCompleted);
   
   const fInicio = topProject.fechaInicio?.toDate ? topProject.fechaInicio.toDate() : new Date();
   const fLimit = topProject.fechaLimite?.toDate ? topProject.fechaLimite.toDate() : new Date();
   const daysTotal = Math.max(Math.ceil((fLimit.getTime() - fInicio.getTime()) / (1000*60*60*24)), 1);
   const percentTimeLeft = (topProject.daysRemaining / daysTotal) * 100;

   let colorMode = 'bg-emerald-500';
   let textMode = 'text-emerald-500';
   if (topProject.daysRemaining <= 2) {
       colorMode = 'bg-rose-500';
       textMode = 'text-rose-500';
   } else if (percentTimeLeft < 30) {
       colorMode = 'bg-amber-500';
       textMode = 'text-amber-500';
   }

   const handleToggleTask = async (taskId: string, currentStatus: boolean, e: React.MouseEvent) => {
       e.stopPropagation();
       if (!user || !currentProfile || !topProject.id) return;
       try {
           const fullTask = topProject.tasks.find(t => t.id === taskId);
           if (!currentStatus && fullTask) {
               await completeTaskWithRecurrence(user.uid, currentProfile.id, topProject.id, fullTask);
           } else {
               await updateTask(user.uid, currentProfile.id, topProject.id, taskId, { isCompleted: !currentStatus });
           }
       } catch(e) { console.error(e) }
   };

   return (
       <>
           <div className="w-full relative z-[155] flex justify-center">
               {!isExpanded ? (
                   <motion.div 
                       initial={{ height: 0 }} 
                       animate={{ height: 4 }} 
                       className={`w-full cursor-pointer hover:h-1.5 transition-all fixed top-0 left-0 ${colorMode}`}
                       onClick={() => setIsExpanded(true)}
                       title="Desplegar Proyecto Urgente"
                   />
               ) : (
                   <div className="w-full max-w-lg mx-auto fixed top-0 left-1/2 -translate-x-1/2 p-2 pt-0 z-[155]">
                      <motion.div 
                          initial={{ y: -100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -100, opacity: 0 }}
                          className="bg-slate-900 text-white rounded-b-[2rem] shadow-2xl p-6 border border-slate-700/50 relative overflow-hidden"
                      >
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-800/80 to-transparent opacity-50 pointer-events-none" />
                          <div className="relative">
                              <div className="flex justify-between items-start mb-5 cursor-pointer" onClick={() => setIsExpanded(false)}>
                                 <div className="flex items-center gap-2.5">
                                     <div className={`w-2 h-2 rounded-full ${colorMode} animate-pulse shadow-[0_0_10px_currentColor]`} style={{ color: colorMode.replace('bg-', '') }} />
                                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Proyecto Mayor Prioridad</span>
                                 </div>
                                 <ChevronDown size={20} className="text-slate-500 hover:text-white transition-colors" />
                              </div>

                              <h3 className="font-extrabold text-xl flex items-center gap-2.5 mb-1.5">
                                  <Flag size={18} className={textMode} strokeWidth={2.5}/>
                                  {topProject.titulo}
                              </h3>
                              <p className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-2">
                                  {topProject.daysRemaining <= 0 ? (
                                      <span className={textMode}>Atrasado / Vence hoy</span>
                                  ) : (
                                      `Faltan ${topProject.daysRemaining} día${topProject.daysRemaining !== 1 ? 's' : ''}`
                                  )}
                              </p>

                              <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2 mb-2">
                                 {uncompletedTasks.length === 0 ? (
                                     <div className="flex flex-col items-center justify-center py-4 opacity-50">
                                        <CheckCircle size={24} className="mb-2" />
                                        <p className="text-xs font-bold text-center">¡Todas las tareas marcadas!</p>
                                        <p className="text-[10px] text-center mt-1">Este proyecto se cerrará al recargar los datos de la app porque ha llegado al 100%.</p>
                                     </div>
                                 ) : (
                                     uncompletedTasks.map(task => (
                                         <div 
                                             key={task.id} 
                                             className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 transition-colors cursor-pointer group border border-slate-700/50"
                                             onClick={(e) => handleToggleTask(task.id, task.isCompleted, e)}
                                         >
                                             <button className="text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0">
                                                 <Circle size={20} strokeWidth={2.5}/>
                                             </button>
                                             <span className="text-sm font-semibold text-slate-200 line-clamp-2 leading-tight">{task.titulo}</span>
                                         </div>
                                     ))
                                 )}
                              </div>
                          </div>
                      </motion.div>
                   </div>
               )}
           </div>

           <AnimatePresence>
               {isExpanded && (
                   <motion.div 
                       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                       className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140]"
                       onClick={() => setIsExpanded(false)}
                   />
               )}
           </AnimatePresence>
       </>
   );
};
