import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvestmentsData } from '../../hooks/useInvestmentsData';
import { useAppStore } from '../../store/useAppStore';
import { Briefcase, TrendingUp, CheckCircle, ChevronDown, Calendar as CalendarIcon, Tag, PlusCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InvestmentsView = () => {
  const navigate = useNavigate();
  const { currentProfile } = useAppStore();
  const { investments, linkedIncomes, categories, loading } = useInvestmentsData();

  const [activeTab, setActiveTab] = useState<'activas' | 'completadas'>('activas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  const formatDate = (dateObj: any) => {
     if (!dateObj) return '';
     const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj.seconds * 1000);
     return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const processedInvs = useMemo(() => {
     return investments.map(inv => {
        const myIncomes = linkedIncomes.filter(inc => inc.inversionIdRelacionada === inv.id);
        const recovered = myIncomes.reduce((sum, inc) => sum + inc.amount, 0);
        const percentage = (recovered / (inv.amount || 1)) * 100;
        
        return {
           ...inv,
           recovered,
           percentage,
           isCompleted: percentage >= 100,
           incomesList: myIncomes
        };
     }).sort((a,b) => {
        const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date.seconds * 1000);
        const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date.seconds * 1000);
        return dB.getTime() - dA.getTime();
     });
  }, [investments, linkedIncomes]);

  const activas = processedInvs.filter(i => !i.isCompleted);
  const completadas = processedInvs.filter(i => i.isCompleted);

  const displayList = activeTab === 'activas' ? activas : completadas;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Retorno de Inversión</h2>
          <p className="text-slate-500 font-medium mt-1">Supervisa los capitales inyectados en tu espacio <b>{currentProfile?.name}</b></p>
        </div>
        <button onClick={() => navigate('/add')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95">
           <PlusCircle size={18} /> Registrar Capital
        </button>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-[1.2rem] w-full max-w-md mx-auto sm:mx-0">
         <button 
           onClick={() => { setActiveTab('activas'); setExpandedId(null); }}
           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${activeTab === 'activas' ? 'bg-white text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
         >
           <TrendingUp size={18} />
           Activas ({activas.length})
         </button>
         <button 
           onClick={() => { setActiveTab('completadas'); setExpandedId(null); }}
           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${activeTab === 'completadas' ? 'bg-white text-emerald-600' : 'text-slate-500 hover:bg-white/50'}`}
         >
           <CheckCircle size={18} />
           Completadas ({completadas.length})
         </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
             <p className="text-slate-400 font-bold animate-pulse">Calculando Retornos...</p>
           </div>
        </div>
      ) : displayList.length === 0 ? (
         <div className="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-3xl flex items-center justify-center mb-6">
               <Briefcase size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No hay inversiones {activeTab === 'activas' ? 'activas' : 'completadas'}</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
               {activeTab === 'activas' 
                 ? 'Añade una nueva "Inversión" para empezar a recuperar tu dinero y ver su progreso.' 
                 : 'Una vez recuperes el 100% o más de una inversión, aparecerá en esta lista como completada.'}
            </p>
         </div>
      ) : (
         <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {displayList.map(inv => (
                 <motion.div 
                   key={inv.id}
                   layout
                   initial={{ opacity: 0, y: 30 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.4 }}
                   className={`bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border transition-all ${
                     inv.isCompleted ? 'border-emerald-100 hover:border-emerald-200 hover:shadow-emerald-500/5' : 'border-slate-100 hover:border-blue-100 hover:shadow-blue-500/5'
                   }`}
                 >
                   <div 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                   >
                      <div className="flex items-start gap-4 flex-1">
                         <div className={`p-4 rounded-[1.2rem] ${inv.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {inv.isCompleted ? <CheckCircle size={26} strokeWidth={2.5} /> : <TrendingUp size={26} strokeWidth={2.5} />}
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                  <Tag size={12} />
                                  {categories[inv.categoryId] || 'Capital Libre'}
                               </span>
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800 line-clamp-1">{inv.description || "Inversión inicial"}</h3>
                            <div className="flex items-center gap-2 mt-1.5 text-[13px] font-bold text-slate-400">
                               <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> Registrado el {formatDate(inv.date)}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 w-full sm:w-auto">
                         <div className="flex flex-col items-start sm:items-end">
                           <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${inv.isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                             {inv.isCompleted ? 'Ganancia Neta' : 'Recuperación'}
                           </span>
                           <span className={`text-3xl font-extrabold tracking-tight ${inv.isCompleted ? 'text-emerald-500' : 'text-blue-600'}`}>
                             {Math.min(inv.percentage, 9999).toFixed(0)}%
                           </span>
                         </div>
                         <motion.button 
                           animate={{ rotate: expandedId === inv.id ? 180 : 0 }}
                           className={`p-2 hidden sm:flex items-center justify-center rounded-full ml-4 transition-colors ${expandedId === inv.id ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'}`}
                         >
                            <ChevronDown size={20} strokeWidth={2.5}/>
                         </motion.button>
                      </div>
                   </div>

                   <div className="mt-8 mb-2">
                       <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 px-1">
                          <span className="uppercase tracking-wide text-[10px]">Inversión Inicial: <span className="text-slate-700 text-xs ml-1">{formatCurrency(inv.amount)}</span></span>
                          <span className={`uppercase tracking-wide text-[10px] ${inv.isCompleted ? 'text-emerald-600' : 'text-blue-600'}`}>
                             Retornado: <span className="text-xs font-extrabold ml-1">{formatCurrency(inv.recovered)}</span>
                          </span>
                       </div>
                       <div className="w-full bg-slate-100/80 rounded-full h-4 overflow-hidden relative shadow-inner">
                          <motion.div 
                             className={`h-full rounded-full absolute left-0 top-0 overflow-hidden ${inv.isCompleted ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(inv.percentage, 100)}%` }}
                             transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                          >
                             {inv.isCompleted && <div className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] animate-[shimmer_2s_infinite] -translate-x-full" />}
                          </motion.div>
                       </div>
                   </div>

                   <AnimatePresence>
                     {expandedId === inv.id && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden mt-6 pt-6 border-t border-slate-100/80"
                       >
                         <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <ArrowUpRight size={16} /> Base de ingresos enlazados ({inv.incomesList.length} ventas)
                         </h4>
                         
                         {inv.incomesList.length === 0 ? (
                            <div className="bg-slate-50 py-4 px-6 rounded-2xl flex items-center justify-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></div>
                               <p className="text-sm font-semibold text-slate-500">Esperando las primeras ventas vinculadas...</p>
                            </div>
                         ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                               {inv.incomesList.map((inc: any) => (
                                 <div key={inc.id} className="flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all">
                                    <div className="flex flex-col">
                                       <span className="font-bold text-slate-700 text-sm">{inc.description || "Venta de inventario"}</span>
                                       <span className="text-xs font-semibold text-slate-400 mt-0.5">{formatDate(inc.date)}</span>
                                    </div>
                                    <span className={`font-extrabold px-3 py-1.5 rounded-xl text-sm ${inv.isCompleted ? 'text-emerald-700 bg-emerald-100' : 'text-blue-700 bg-blue-100'}`}>+{formatCurrency(inc.amount)}</span>
                                 </div>
                               ))}
                            </div>
                         )}
                       </motion.div>
                     )}
                   </AnimatePresence>

                 </motion.div>
              ))}
            </AnimatePresence>
         </div>
      )}
    </div>
  )
}
