import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCategories, deleteTransaction, updateTransaction } from '../../lib/firestore';
import { Search, Trash2, Pencil, Filter, Tag, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Briefcase, X, CheckCircle } from 'lucide-react';

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
  
  const [toastMsg, setToastMsg] = useState('');
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editMonto, setEditMonto] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editTipo, setEditTipo] = useState('ingreso');
  const [editDate, setEditDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const { filteredIncome, filteredExpense, filteredBalance, isFiltering } = useMemo(() => {
     let inc = 0;
     let exp = 0;
     
     filteredList.forEach(t => {
        if (t.type === 'ingreso') inc += t.amount;
        else exp += t.amount;
     });

     const isFil = activeFilter !== 'Todos' || selectedCategory !== 'all' || startDate !== '' || endDate !== '' || searchQuery.trim() !== '';

     return {
        filteredIncome: inc,
        filteredExpense: exp,
        filteredBalance: inc - exp,
        isFiltering: isFil
     };
  }, [filteredList, activeFilter, selectedCategory, startDate, endDate, searchQuery]);

  const handleOpenEdit = (tx: any, evt: React.MouseEvent) => {
      evt.stopPropagation();
      setEditingTx(tx);
      setEditMonto(tx.amount.toString());
      setEditDesc(tx.description || '');
      setEditCat(tx.categoryId || '');
      setEditTipo(tx.type || 'ingreso');
      
      const dateObj = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
      setEditDate(dateObj.toISOString().split('T')[0]);
  };

  const handleUpdate = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !currentProfile || !editingTx || !editMonto || !editCat || !editTipo || !editDate) return;
     setIsUpdating(true);
     try {
       await updateTransaction(user.uid, currentProfile.id, editingTx.id, {
          amount: parseFloat(editMonto),
          description: editDesc.trim(),
          categoryId: editCat,
          type: editTipo,
          date: new Date(editDate + 'T12:00:00')
       });
       setEditingTx(null);
       setToastMsg('Transacción actualizada correctamente 🎉');
       setTimeout(() => setToastMsg(''), 4000);
     } catch (err) {
       console.error(err);
       setToastMsg('Error al actualizar transacción');
       setTimeout(() => setToastMsg(''), 4000);
     } finally {
       setIsUpdating(false);
     }
  };

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

      {/* Dynamic Summary Banner */}
      {!loading && filteredList.length > 0 && (
         <motion.div 
           key={isFiltering ? 'filtering' : 'all'}
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.4, ease: "easeOut" }}
           className="bg-white rounded-[2.5rem] p-5 lg:px-6 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
         >
            <div className="flex items-center gap-4">
               <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 ${isFiltering ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  {isFiltering ? <Filter size={24} strokeWidth={2.5}/> : <Briefcase size={24} strokeWidth={2.5}/>}
               </div>
               <div>
                  <h4 className="text-sm xl:text-base font-extrabold text-slate-800">{isFiltering ? 'Resumen de la búsqueda' : 'Resumen Total del Perfil'}</h4>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{filteredList.length} registros encontrados</p>
               </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 md:ml-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
               <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-widest">Ingresos</span>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-600">+{formatCurrency(filteredIncome)}</span>
               </div>
               <div className="hidden sm:block w-px h-8 bg-slate-100 shrink-0"></div>
               <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-400 tracking-widest">Egresos</span>
                  <span className="text-sm sm:text-base font-extrabold text-rose-500">-{formatCurrency(filteredExpense)}</span>
               </div>
               <div className="hidden sm:block w-px h-8 bg-slate-100 shrink-0"></div>
               <div className={`flex flex-col items-end px-4 py-2 rounded-2xl border shrink-0 ${filteredBalance >= 0 ? 'bg-slate-800 border-slate-800' : 'bg-rose-50 border-rose-200'}`}>
                  <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-0.5 ${filteredBalance >= 0 ? 'text-slate-300' : 'text-rose-500'}`}>Balance Neto</span>
                  <span className={`text-base sm:text-lg font-extrabold tracking-tight ${filteredBalance >= 0 ? 'text-white' : 'text-rose-600'}`}>
                     {filteredBalance >= 0 ? '' : '-'}{formatCurrency(Math.abs(filteredBalance))}
                  </span>
               </div>
            </div>
         </motion.div>
      )}

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
                           <div className="flex items-center gap-1 shrink-0 mt-1">
                           <button 
                             onClick={(e) => handleOpenEdit(tx, e)}
                             className="p-2 sm:p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors shrink-0 outline-none"
                             title="Editar transacción"
                           >
                              <Pencil size={18} strokeWidth={2.5}/>
                           </button>
                           <button 
                             onClick={(e) => handleDelete(tx.id, e)}
                             disabled={isDeleting}
                             className="p-2 sm:p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 outline-none"
                             title="Eliminar transacción"
                           >
                              {isDeleting ? <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"/> : <Trash2 size={18} strokeWidth={2.5}/>}
                           </button>
                         </div>
                        </div>
                     </motion.div>
                   );
               })}
            </motion.div>
         </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
         {editingTx && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isUpdating && setEditingTx(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
               <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <div className="p-6 sm:p-8">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                         <Pencil size={24} strokeWidth={2.5}/>
                      </div>
                      <button onClick={() => !isUpdating && setEditingTx(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                         <X size={20} />
                      </button>
                   </div>
                   
                   <h3 className="text-2xl font-extrabold text-slate-800 mb-6">Editar Transacción</h3>

                   <form onSubmit={handleUpdate} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tipo</label>
                        <select required value={editTipo} onChange={e => setEditTipo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-700">
                           <option value="ingreso">Ingreso</option>
                           <option value="gasto_fijo">Gasto Fijo</option>
                           <option value="gasto_variable">Gasto Variable</option>
                           <option value="gasto_innecesario">Gasto Innecesario</option>
                           <option value="inversion">Inversión</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Monto</label>
                           <div className="relative">
                              <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                              <input type="number" required min="1" step="1" value={editMonto} onChange={e => setEditMonto(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-700" />
                           </div>
                         </div>
                         <div>
                           <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fecha</label>
                           <input type="date" required value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-700" />
                         </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Categoría</label>
                        <select required value={editCat} onChange={e => setEditCat(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-700">
                           <option value="" disabled>Selecciona una categoría</option>
                           {Object.entries(categories).map(([id, name]) => (
                              <option key={id} value={id}>{name}</option>
                           ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Descripción</label>
                        <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Comentario (opcional)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-slate-700 placeholder:text-slate-400" />
                      </div>

                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setEditingTx(null)} disabled={isUpdating} className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">
                            Cancelar
                         </button>
                         <button type="submit" disabled={isUpdating || !editMonto || !editCat || !editTipo || !editDate} className="flex-[2] flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70">
                            {isUpdating ? <div className="w-5 h-5 border-2 border-slate-200 border-t-white rounded-full animate-spin" /> : 'Guardar Cambios'}
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
