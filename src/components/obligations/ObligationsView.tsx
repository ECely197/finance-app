import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useObligationsData } from '../../hooks/useObligationsData';
import { useAppStore } from '../../store/useAppStore';
import { Target, Plus, CheckCircle, Trash2, Calendar as CalendarIcon, Clock, X, Flag } from 'lucide-react';
import { createObligation, deleteObligation, updateObligation } from '../../lib/firestore';

export const ObligationsView = () => {
   const { user, currentProfile } = useAppStore();
   const { processedObligations, loading } = useObligationsData();

   const [showModal, setShowModal] = useState(false);
   const [titulo, setTitulo] = useState('');
   const [monto, setMonto] = useState('');
   const [fechaLimite, setFechaLimite] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [toastMsg, setToastMsg] = useState('');

   const handleCreate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !currentProfile || !titulo.trim() || !monto || !fechaLimite) return;
     setIsSubmitting(true);
     try {
        await createObligation(user.uid, currentProfile.id, {
           titulo: titulo.trim(),
           montoObjetivo: parseFloat(monto),
           fechaLimite: new Date(fechaLimite + 'T23:59:59'),
           fechaInicio: new Date(),
           cumplida: false,
           createdAt: new Date()
        });
        setTitulo('');
        setMonto('');
        setFechaLimite('');
        setShowModal(false);
        setToastMsg('Meta guardada exitosamente 🎉');
        setTimeout(() => setToastMsg(''), 4000);
     } catch (err) {
        console.error(err);
        setToastMsg('Hubo un error al guardar');
        setTimeout(() => setToastMsg(''), 4000);
     } finally {
        setIsSubmitting(false);
     }
  };

  const handleToggleCumplida = async (ob: any) => {
      if (!user || !currentProfile) return;
      try {
         await updateObligation(user.uid, currentProfile.id, ob.id, { cumplida: !ob.cumplida });
      } catch (err) {
         console.error(err);
      }
  };

  const handleDelete = async (id: string) => {
      if (!user || !currentProfile) return;
      if (!window.confirm("¿Confirma eliminar esta meta de forma permanente?")) return;
      try {
         await deleteObligation(user.uid, currentProfile.id, id);
      } catch (err) {
         console.error(err);
      }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  const formatDate = (dateObj: Date) => dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  const containerVariants: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: any = { hidden: { opacity: 0, scale: 0.95, y: 15 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Responsabilidades</h2>
          <p className="text-slate-500 font-medium mt-1">Registra y sigue tus metas vs tus ventas generadas en <b>{currentProfile?.name}</b></p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95">
           <Plus size={18} strokeWidth={2.5}/> Añadir Meta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
             <p className="text-slate-400 font-bold animate-pulse">Cargando responsabilidades...</p>
           </div>
        </div>
      ) : processedObligations.length === 0 ? (
         <div className="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center shadow-sm flex flex-col items-center mt-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-3xl flex items-center justify-center mb-6">
               <Target size={36} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No tienes metas o responsabilidades activas</h3>
            <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-8">
               ¿Tienes que pagar un arriendo? ¿Una deuda financiera? Registra tu meta y la app medirá cuánto te falta vender para cumplirla antes de la fecha límite.
            </p>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm">
               <Plus size={18} strokeWidth={2.5}/> Añadir tu primera responsabilidad
            </button>
         </div>
      ) : (
         <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {processedObligations.map(ob => {
               const isUrgent = ob.daysRemaining <= 5 && !ob.cumplida;
               const isCompleted = ob.cumplida;

               return (
                  <motion.div 
                     key={ob.id} 
                     variants={itemVariants}
                     layout
                     className={`bg-white rounded-[2rem] p-6 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border transition-all flex flex-col ${
                        isCompleted ? 'border-emerald-100 opacity-70 hover:opacity-100' : 
                        isUrgent ? 'border-orange-200 shadow-orange-500/5' : 'border-slate-100 hover:border-blue-100 hover:shadow-blue-500/5'
                     }`}
                  >
                     <div className="flex justify-between items-start mb-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-50 text-emerald-500' : isUrgent ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                           {isCompleted ? <CheckCircle size={22} strokeWidth={2.5}/> : <Flag size={22} strokeWidth={2.5}/>}
                        </div>
                        <div className="flex items-center gap-2">
                           {isCompleted && <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">CUMPLIDA</span>}
                           <button onClick={() => handleDelete(ob.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                              <Trash2 size={16} strokeWidth={2.5}/>
                           </button>
                        </div>
                     </div>

                     <div className="mb-6 flex-1">
                        <h3 className={`text-xl font-extrabold mb-1 line-clamp-2 ${isCompleted ? 'text-slate-600 line-through' : 'text-slate-800'}`}>{ob.titulo}</h3>
                        <p className="text-[13px] font-bold text-slate-400 flex items-center gap-1.5 mt-2">
                           <Target size={14}/> Objetivo: <span className="text-slate-600">{formatCurrency(ob.montoObjetivo)}</span>
                        </p>
                     </div>

                     <div className="mb-4">
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2.5">
                           <span className={isCompleted ? 'text-emerald-500' : 'text-slate-400'}>{isCompleted ? 'Meta Asegurada' : 'Generado en Ventas'}</span>
                           <span className={isCompleted ? 'text-emerald-600' : ob.isGoodTrend ? 'text-emerald-600' : 'text-blue-600'}>{ob.progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner relative">
                           <motion.div 
                              className={`h-full absolute left-0 top-0 rounded-full ${isCompleted ? 'bg-emerald-500' : ob.isGoodTrend ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${ob.progress}%` }}
                              transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                           />
                        </div>
                     </div>

                     <div className="flex items-end justify-between mt-4 pb-2 border-b border-dashed border-slate-100 mb-4">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Falta Vender</span>
                            {ob.remainingAmount <= 0 ? (
                               <span className="text-lg font-extrabold tracking-tight text-emerald-500">¡Meta cumplida! 🎉</span>
                            ) : (
                               <span className="text-lg font-extrabold tracking-tight text-slate-700">
                                  {formatCurrency(ob.remainingAmount)}
                               </span>
                            )}
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Límite</span>
                            <span className="text-sm font-bold text-slate-600 flex items-center gap-1">
                               <CalendarIcon size={12}/> {formatDate(ob.fLimit)}
                            </span>
                         </div>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
                           isCompleted ? 'bg-emerald-50 text-emerald-600' :
                           isUrgent ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'
                        }`}>
                           <Clock size={14}/> 
                           {isCompleted ? 'Superado' : 
                            ob.daysRemaining === 0 ? '¡Vence Hoy!' : 
                            `Faltan ${ob.daysRemaining} días`}
                        </div>

                        <button 
                           onClick={() => handleToggleCumplida(ob)}
                           className={`p-2 rounded-xl border-2 transition-all ${
                              isCompleted 
                              ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600' 
                              : 'bg-white border-emerald-100 text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200'
                           }`}
                           title={isCompleted ? "Reabrir meta" : "Marcar como cumplida manualmente"}
                        >
                           <CheckCircle size={18} strokeWidth={isCompleted ? 2.5 : 3}/>
                        </button>
                     </div>

                  </motion.div>
               );
            })}
         </motion.div>
      )}

      {/* CRUD Modal */}
      <AnimatePresence>
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
               <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10">
                 <div className="p-8">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                         <Target size={24} strokeWidth={2.5}/>
                      </div>
                      <button onClick={() => !isSubmitting && setShowModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                         <X size={20} />
                      </button>
                   </div>
                   
                   <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Nueva Responsabilidad</h3>
                   <p className="text-slate-500 font-medium text-sm mb-8">Calcularemos los ingresos generados a partir de hoy para medir si alcanzas esta meta.</p>

                   <form onSubmit={handleCreate} className="space-y-5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Título o Meta</label>
                        <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Arriendo Local, Deuda Banco..." className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Monto Objetivo</label>
                        <div className="relative">
                           <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                           <input type="number" required min="1" step="1" value={monto} onChange={e => setMonto(e.target.value)} placeholder="1500000" className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fecha Límite</label>
                        <input type="date" required value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 cursor-pointer" />
                      </div>

                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setShowModal(false)} disabled={isSubmitting} className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">
                            Cancelar
                         </button>
                         <button type="submit" disabled={isSubmitting || !titulo.trim() || !monto || !fechaLimite} className="flex-[2] flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-200 border-t-white rounded-full animate-spin" /> : 'Guardar Meta'}
                         </button>
                      </div>
                   </form>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
         {toastMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] font-bold flex items-center gap-3"
            >
               <CheckCircle size={20} strokeWidth={2.5} />
               {toastMsg}
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};
