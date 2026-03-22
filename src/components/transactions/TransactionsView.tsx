import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCategories, deleteTransaction } from '../../lib/firestore';
import { Search, Trash2, Filter, Tag, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Briefcase, X } from 'lucide-react';

export const TransactionsView = () => {
  const { user, currentProfile } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
     if (!user || !currentProfile) return;
     setLoading(true);

     // Load categories statically once for mapping
     getCategories(user.uid, currentProfile.id).then(cats => {
         const map: Record<string, string> = {};
         cats.forEach((c: any) => map[c.id] = c.name);
         setCategories(map);
     });

     const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
     const q = query(txRef); // Fetching all transactions to sort & filter locally
     
     const unsub = onSnapshot(q, (snap) => {
         const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
         list.sort((a: any, b: any) => {
             const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date.seconds * 1000);
             const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date.seconds * 1000);
             return dB.getTime() - dA.getTime();
         });
         setTransactions(list);
         setLoading(false);
     }, (err) => {
         console.error(err);
         setLoading(false);
     });

     return () => unsub();
  }, [user, currentProfile]);

  const filteredList = useMemo(() => {
      let filtered = transactions;
      
      // 1. Tipo
      if (activeFilter !== 'Todos') {
         filtered = filtered.filter(t => {
            if (activeFilter === 'Ingresos') return t.type === 'ingreso';
            if (activeFilter === 'Inversiones') return t.type === 'inversion';
            if (activeFilter === 'Gastos') return t.type.startsWith('gasto_');
            return true;
         });
      }
      
      // 2. Categoría
      if (selectedCategory !== 'all') {
         filtered = filtered.filter(t => t.categoryId === selectedCategory);
      }

      // 3. Rango de Fechas
      if (startDate || endDate) {
         const s = startDate ? new Date(startDate + 'T00:00:00') : new Date('2000-01-01');
         const e = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-01-01');
         
         filtered = filtered.filter(t => {
             const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date.seconds * 1000);
             return txDate >= s && txDate <= e;
         });
      }

      // 4. Búsqueda de Texto
      if (searchQuery.trim()) {
         const q = searchQuery.toLowerCase();
         filtered = filtered.filter(t => 
             (t.description && t.description.toLowerCase().includes(q)) || 
             (categories[t.categoryId] && categories[t.categoryId].toLowerCase().includes(q))
         );
      }
      return filtered;
  }, [transactions, activeFilter, selectedCategory, startDate, endDate, searchQuery, categories]);

  const handleDelete = async (id: string, evt: React.MouseEvent) => {
     evt.stopPropagation();
     if (!user || !currentProfile) return;
     if (!window.confirm("¿Seguro que deseas eliminar este movimiento permanentemente? Afectará los gráficos y el balance neto.")) return;
     
     setDeletingId(id);
     try {
        await deleteTransaction(user.uid, currentProfile.id, id);
     } catch(e) {
        console.error(e);
     } finally {
        setDeletingId(null);
     }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  const formatDate = (dateObj: any) => {
     if (!dateObj) return '';
     const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj.seconds * 1000);
     return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Historial</h2>
          <p className="text-slate-500 font-medium mt-1">Explora todos los movimientos de <b>{currentProfile?.name}</b></p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-5 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left/Top: Types & Categories */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full lg:w-auto flex-1">
               <div className="flex flex-wrap gap-2">
                  {['Todos', 'Ingresos', 'Gastos', 'Inversiones'].map(filter => (
                     <button 
                       key={filter}
                       onClick={() => setActiveFilter(filter)}
                       className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all focus:outline-none ${
                           activeFilter === filter 
                           ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' 
                           : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                       }`}
                     >
                        {filter}
                     </button>
                  ))}
               </div>
               
               <div className="w-full md:w-52 relative">
                  <select 
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                     className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-2xl font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer text-sm"
                  >
                     <option value="all">Todas las categorías</option>
                     {Object.entries(categories).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                     ))}
                  </select>
                  <Filter size={14} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
               </div>
            </div>

            {/* Right/Bottom: Dates & Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full lg:w-auto">
               
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-4 focus-within:border-blue-500 focus-within:ring-blue-500/10 focus-within:bg-white transition-all overflow-hidden flex-nowrap">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="w-full md:w-[130px] px-3 py-2.5 bg-transparent font-bold text-slate-600 text-[13px] outline-none cursor-pointer" 
                    />
                    <span className="text-slate-300 font-bold shrink-0">-</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="w-full md:w-[130px] px-3 py-2.5 bg-transparent font-bold text-slate-600 text-[13px] outline-none cursor-pointer" 
                    />
                  </div>
                  {(startDate || endDate) && (
                     <button 
                       onClick={() => { setStartDate(''); setEndDate(''); }}
                       className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors shrink-0"
                       title="Limpiar fechas"
                     >
                        <X size={16} strokeWidth={2.5}/>
                     </button>
                  )}
               </div>

               <div className="relative w-full md:w-56 shrink-0">
                  <Search size={18} className="absolute left-4 top-3 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar descripción..." 
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700 placeholder:text-slate-400 text-sm"
                  />
               </div>
            </div>
      </motion.div>

      {/* Transactions List */}
      {loading ? (
         <div className="flex justify-center items-center h-64">
           <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
             <p className="text-slate-400 font-bold animate-pulse">Cargando base de datos...</p>
           </div>
         </div>
      ) : filteredList.length === 0 ? (
         <div className="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-6">
               <Filter size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Sin resultados</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
               No hay transacciones registradas en este espacio que coincidan con tus filtros actuales.
            </p>
         </div>
      ) : (
         <div className="bg-white rounded-[2rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-slate-100/80">
               {filteredList.map((tx) => {
                   let txColor = 'text-slate-700', bgType = 'bg-slate-100', icon = null, badgeBg = 'bg-slate-100 text-slate-600', sign = '';
                   
                   if (tx.type === 'ingreso') {
                      txColor = 'text-emerald-600'; bgType = 'bg-emerald-50';
                      icon = <ArrowUpRight size={20} className="text-emerald-500" strokeWidth={2.5}/>;
                      badgeBg = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                      sign = '+';
                   } else if (tx.type === 'inversion') {
                      txColor = 'text-indigo-600'; bgType = 'bg-indigo-50';
                      icon = <Briefcase size={20} className="text-indigo-500" strokeWidth={2.5} />;
                      badgeBg = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
                      sign = '-';
                   } else {
                      txColor = 'text-rose-600'; bgType = 'bg-rose-50';
                      icon = <ArrowDownRight size={20} className="text-rose-500" strokeWidth={2.5}/>;
                      badgeBg = 'bg-rose-50 text-rose-600 border border-rose-100';
                      sign = '-';
                   }

                   const isDeleting = deletingId === tx.id;

                   return (
                     <motion.div 
                        key={tx.id}
                        variants={itemVariants}
                        layout
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/80 transition-colors group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                     >
                        <div className="flex items-start sm:items-center gap-5 flex-1 w-full">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${bgType}`}>
                              {icon}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${badgeBg}`}>
                                     <Tag size={10} />
                                     {categories[tx.categoryId] || 'General'}
                                  </span>
                                  {tx.inversionIdRelacionada && (
                                     <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                        ROI
                                     </span>
                                  )}
                               </div>
                               <h4 className="text-base font-extrabold text-slate-800 line-clamp-1 mb-1">{tx.description || <span className="text-slate-400 font-semibold italic">Monto sin descripción de detalles.</span>}</h4>
                               <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5"><CalendarIcon size={12}/> {formatDate(tx.date)}</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0 pl-16 sm:pl-0 w-full sm:w-auto">
                           <div className="flex flex-col sm:items-end">
                              <span className={`text-xl sm:text-2xl font-extrabold tracking-tight ${txColor}`}>
                                 {sign}{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest sm:text-right mt-0.5">{tx.type}</span>
                           </div>
                           
                           <button 
                             onClick={(e) => handleDelete(tx.id, e)}
                             disabled={isDeleting}
                             className="p-3 bg-white hover:bg-rose-50 border border-slate-100 text-slate-300 hover:text-rose-600 rounded-2xl transition-all shadow-sm hover:shadow-rose-500/10 focus:outline-none focus:ring-4 focus:ring-rose-500/10 active:scale-95"
                             title="Eliminar transacción"
                           >
                              {isDeleting ? <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"/> : <Trash2 size={18} strokeWidth={2.5}/>}
                           </button>
                        </div>
                     </motion.div>
                   );
               })}
            </motion.div>
         </div>
      )}

    </div>
  );
};
