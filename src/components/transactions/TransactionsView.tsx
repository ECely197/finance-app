import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCategories, deleteTransaction, updateTransaction, toggleTransactionDisbursement } from '../../lib/firestore';
import {
  Search,
  Trash2,
  Pencil,
  Filter,
  Tag,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  X,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  Package,
  Hourglass,
} from 'lucide-react';
import { Ripple } from '../ui/Ripple';
import { MiniCalendar } from '../ui/MiniCalendar';
import { useSeparadosData, type Separado } from '../../hooks/useSeparadosData';
import { EditApartadoModal } from './EditApartadoModal';

const ONE_UI_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30
};

const getTimeRangeBounds = (range: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start: Date | null = new Date();
  let end: Date | null = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'all':
      start = null;
      end = null;
      break;
    case 'custom':
      start = customStart ? new Date(customStart + 'T00:00:00') : null;
      end = customEnd ? new Date(customEnd + 'T23:59:59') : null;
      break;
    default:
      start = null;
      end = null;
  }
  return { start, end };
};

export const TransactionsView = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { user, currentProfile } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Time Range Selector State (Default: last_7_days)
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  // Category Selector State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  
  const [toastMsg, setToastMsg] = useState('');
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editMonto, setEditMonto] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editTipo, setEditTipo] = useState('ingreso');
  const [editDate, setEditDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Separados & Payment Gateways state
  const { separados } = useSeparadosData();
  const [editingApartado, setEditingApartado] = useState<Separado | null>(null);

  const rangeOptions = [
    { value: 'today',       label: 'Hoy',                 icon: Clock },
    { value: 'last_7_days', label: 'Últimos 7 días',      icon: Filter },
    { value: 'this_month',  label: 'Este mes',             icon: CalendarIcon },
    { value: 'last_month',  label: 'Mes pasado',           icon: Clock },
    { value: 'all',         label: 'Todo el historial',   icon: Package },
    { value: 'custom',      label: 'Personalizado...',     icon: ChevronDown },
  ];

  const currentOption = rangeOptions.find(o => o.value === timeRange) ?? rangeOptions[1];

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggleDisbursement = async (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !currentProfile) return;
    const newStatus = tx.disbursementStatus === 'desembolsado' ? 'pendiente' : 'desembolsado';
    try {
      await toggleTransactionDisbursement(user.uid, currentProfile.id, tx.id, newStatus);
      setToastMsg(`Estado cambiado a: ${newStatus === 'desembolsado' ? 'Desembolsado' : 'Pendiente'}`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenApartadoEdit = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    let found = separados.find((s) => s.id === tx.separadoId);
    if (!found) {
      found = separados.find((s) => tx.description?.toLowerCase().includes(s.cliente?.toLowerCase()));
    }
    if (!found) {
      found = {
        id: tx.separadoId || tx.id,
        cliente: tx.description?.replace('Abono apartado: ', '').replace('Abono a separado: ', '') || 'Apartado',
        valorTotal: tx.grossAmount || tx.amount,
        totalAbonado: tx.amount,
        estado: 'pendiente',
        createdAt: tx.date?.toDate ? tx.date.toDate() : new Date(),
      } as Separado;
    }
    setEditingApartado(found);
  };

  useEffect(() => {
     if (!user || !currentProfile) return;
     setLoading(true);

     getCategories(user.uid, currentProfile.id).then(cats => {
         const map: Record<string, string> = {};
         cats.forEach((c: any) => map[c.id] = c.name);
         setCategories(map);
     });

     const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
     const q = query(txRef);
     
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
            if (activeFilter === 'Gastos') return t.type.startsWith('gasto_');
            if (activeFilter === 'Gastos Fijos') return t.type === 'gasto_fijo';
            if (activeFilter === 'Gastos Variables') return t.type === 'gasto_variable';
            if (activeFilter === 'Innecesarios') return t.type === 'gasto_innecesario';
            if (activeFilter === 'Inversiones') return t.type === 'inversion';
            if (activeFilter === 'Apartados') {
               return t.paymentMethod === 'apartado' || Boolean(t.separadoId) || t.categoryId === 'abono-separado' || (t.description && t.description.toLowerCase().includes('apartado')) || (t.description && t.description.toLowerCase().includes('separado'));
            }
            return true;
         });
      }
      
      // 2. Categoría
      if (selectedCategory !== 'all') {
         filtered = filtered.filter(t => {
            if (t.categoryId === selectedCategory) return true;
            if (Array.isArray(t.categoryIds) && t.categoryIds.includes(selectedCategory)) return true;
            if (Array.isArray(t.categories) && t.categories.includes(categories[selectedCategory])) return true;
            return false;
         });
      }

      // 3. Rango de Fechas (Time Range con Pre-carga de 7 días por defecto)
      const { start, end } = getTimeRangeBounds(timeRange, customStart, customEnd);
      if (start || end) {
         filtered = filtered.filter(t => {
             const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date.seconds * 1000);
             if (start && txDate < start) return false;
             if (end && txDate > end) return false;
             return true;
         });
      }

      // 4. Búsqueda de Texto
      if (searchQuery.trim()) {
         const q = searchQuery.toLowerCase();
         filtered = filtered.filter(t => 
             (t.description && t.description.toLowerCase().includes(q)) || 
             (categories[t.categoryId] && categories[t.categoryId].toLowerCase().includes(q)) ||
             (Array.isArray(t.categories) && t.categories.some((c: string) => c.toLowerCase().includes(q))) ||
             (t.category && t.category.toLowerCase().includes(q))
         );
      }
      return filtered;
  }, [transactions, activeFilter, selectedCategory, timeRange, customStart, customEnd, searchQuery, categories]);

  const { filteredIncome, filteredExpense, filteredBalance, isFiltering } = useMemo(() => {
     let inc = 0;
     let exp = 0;
     
     filteredList.forEach(t => {
        if (t.type === 'ingreso') inc += t.amount;
        else exp += t.amount;
     });

     const isFil = activeFilter !== 'Todos' || selectedCategory !== 'all' || timeRange !== 'all' || searchQuery.trim() !== '';

     return {
        filteredIncome: inc,
        filteredExpense: exp,
        filteredBalance: inc - exp,
        isFiltering: isFil
     };
  }, [filteredList, activeFilter, selectedCategory, timeRange, searchQuery]);

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
        const selectedDate = new Date(editDate + 'T00:00:00');
        const now = new Date();
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        await updateTransaction(user.uid, currentProfile.id, editingTx.id, {
           amount: parseFloat(editMonto),
           description: editDesc.trim(),
           categoryId: editCat,
           category: categories[editCat] || 'General',
           categories: [categories[editCat] || 'General'],
           type: editTipo,
           date: selectedDate
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
     const datePart = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
     const timePart = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
     return `${datePart} • ${timePart}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } }
  };

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-6 ${hideHeader ? '' : 'pb-32'}`}>
      
      {/* HEADER SECTION (Period Selector & Title) */}
      <div className="pt-2 sm:pt-6 pb-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {!hideHeader && (
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Historial</h2>
            <p className="text-slate-500 dark:text-zinc-400 font-medium mt-1">Explora los movimientos de <b className="text-slate-700 dark:text-zinc-200">{currentProfile?.name}</b></p>
          </div>
        )}

        {/* Translucent One UI Period Selector */}
        <div className="relative w-full sm:w-auto ml-auto" ref={timeDropdownRef}>
          <motion.button
            onClick={() => setShowTimeDropdown(prev => !prev)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2.5 bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl border border-white/40 dark:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-full px-4 sm:px-5 py-2.5 w-full sm:w-auto cursor-pointer hover:shadow-md transition-all h-11"
          >
            <Filter size={15} className="text-[#0381FE] dark:text-[#387AFF] shrink-0" />
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs sm:text-sm whitespace-nowrap">{currentOption.label}</span>
              {timeRange === 'custom' && customStart && customEnd && (
                <span className="text-[10px] font-bold text-[#0381FE] dark:text-[#387AFF] bg-[#0381FE]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {customStart.slice(5)} → {customEnd.slice(5)}
                </span>
              )}
            </div>
            <motion.div 
              className="ml-auto"
              animate={{ rotate: showTimeDropdown ? 180 : 0 }} 
              transition={{ duration: 0.18 }}
            >
              <ChevronDown size={14} className="text-[#0381FE] dark:text-[#387AFF]" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showTimeDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="absolute right-0 mt-2 w-64 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 z-[200] p-2 overflow-hidden"
                style={{ transformOrigin: 'top right' }}
              >
                {rangeOptions.map((opt) => {
                  const IconComp = opt.icon;
                  const isActive = timeRange === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTimeRange(opt.value);
                        if (opt.value !== 'custom') setShowTimeDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[20px] transition-all text-left group active:scale-[0.96] ${
                        isActive
                          ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] font-bold'
                          : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#0381FE] text-white'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 group-hover:bg-[#0381FE]/10 group-hover:text-[#0381FE]'
                      }`}>
                        <IconComp size={14} strokeWidth={2.5} />
                      </div>
                      <span className="font-bold text-xs sm:text-sm">{opt.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0381FE] dark:bg-[#387AFF]" />}
                    </button>
                  );
                })}

                {/* Custom Date Range Panel */}
                <AnimatePresence>
                  {timeRange === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 pt-3 px-1 border-t border-black/5 dark:border-white/5">
                        <div className="flex flex-col gap-2 mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setActiveDateField(activeDateField === 'start' ? null : 'start')}
                              className={`flex flex-col items-start px-3 py-2 rounded-2xl border transition-all ${
                                activeDateField === 'start' 
                                  ? 'border-[#0381FE] bg-[#0381FE]/10 text-[#0381FE]' 
                                  : 'border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                              <span className="text-xs font-bold">{customStart || '00/00/00'}</span>
                            </button>
                            <button
                              onClick={() => setActiveDateField(activeDateField === 'end' ? null : 'end')}
                              className={`flex flex-col items-start px-3 py-2 rounded-2xl border transition-all ${
                                activeDateField === 'end' 
                                  ? 'border-[#0381FE] bg-[#0381FE]/10 text-[#0381FE]' 
                                  : 'border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasta</span>
                              <span className="text-xs font-bold">{customEnd || '00/00/00'}</span>
                            </button>
                          </div>

                          <AnimatePresence>
                            {activeDateField && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="mt-1"
                              >
                                <MiniCalendar 
                                  selectedDate={activeDateField === 'start' ? customStart : customEnd}
                                  onSelect={(date) => {
                                    if (activeDateField === 'start') setCustomStart(date);
                                    else setCustomEnd(date);
                                    setActiveDateField(null);
                                  }}
                                  onClose={() => {
                                    if (activeDateField === 'start') setCustomStart('');
                                    else setCustomEnd('');
                                    setActiveDateField(null);
                                  }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <motion.button
                            onClick={() => {
                              if (customStart && customEnd) setShowTimeDropdown(false);
                            }}
                            whileTap={{ scale: 0.96 }}
                            disabled={!customStart || !customEnd}
                            className="w-full py-2.5 bg-[#0381FE] hover:bg-[#026cd5] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs transition-colors mt-1 shadow-md shadow-[#0381FE]/25"
                          >
                            Aplicar rango
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toolbar / Filters (Glassmorphic) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] flex flex-col gap-4"
      >
            {/* Top Row: Smart Chips (Movement Type Filters) */}
            <div className="w-full">
               <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap">
                  {['Todos', 'Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Innecesarios', 'Inversiones', 'Apartados'].map(filter => {
                     const isActive = activeFilter === filter;
                     return (
                        <button 
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`px-3.5 py-2 rounded-full font-extrabold text-xs whitespace-nowrap transition-transform duration-150 active:scale-[0.96] relative overflow-hidden flex-shrink-0 ${
                              isActive 
                              ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] ring-1 ring-[#0381FE]/30' 
                              : 'bg-slate-100/70 dark:bg-[#1C1C1E] text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                           <Ripple />
                           {filter}
                        </button>
                     );
                  })}
               </div>
            </div>

            {/* Bottom Row: Selectors & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
               {/* Custom Category Picker */}
               <div className="relative w-full sm:w-56" ref={catDropdownRef}>
                  <button
                    onClick={() => setShowCatDropdown(!showCatDropdown)}
                    className="w-full flex items-center justify-between bg-slate-100/70 dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 px-4 py-2.5 rounded-full font-bold transition-all text-xs group active:scale-[0.96]"
                  >
                     <div className="flex items-center gap-2 overflow-hidden">
                        <Tag size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{selectedCategory === 'all' ? 'Categorías' : categories[selectedCategory]}</span>
                     </div>
                     <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                     {showCatDropdown && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 8 }}
                          className="absolute left-0 mt-2 w-64 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 z-[200] p-2 overflow-hidden"
                        >
                           <div className="max-h-64 overflow-y-auto custom-scrollbar">
                              <button
                                onClick={() => { setSelectedCategory('all'); setShowCatDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left text-xs sm:text-sm font-bold ${selectedCategory === 'all' ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                              >
                                 <CheckCircle size={14} className={selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'} />
                                 Todas las categorías
                              </button>
                              <div className="h-px bg-black/5 dark:bg-white/5 my-1 mx-2" />
                              {Object.entries(categories).map(([id, name]) => (
                                 <button
                                   key={id}
                                   onClick={() => { setSelectedCategory(id); setShowCatDropdown(false); }}
                                   className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-xs sm:text-sm font-bold ${selectedCategory === id ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                                 >
                                    <Tag size={14} className="text-slate-400" />
                                    <span className="truncate">{name}</span>
                                 </button>
                              ))}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* Search Bar Refined */}
               <div className="relative w-full sm:w-72 shrink-0 group">
                  <Search size={15} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-[#0381FE] transition-colors pointer-events-none" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar descripción o categoría..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 dark:bg-[#1C1C1E] hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 focus:bg-white dark:focus:bg-black border-none rounded-full focus:outline-none focus:ring-2 focus:ring-[#0381FE]/30 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400 text-xs"
                  />
               </div>
            </div>
      </motion.div>

      {/* Dynamic Summary Banner (Real Glassmorphism & Pop-up view adaptive) */}
      {!loading && filteredList.length > 0 && (
         <motion.div 
           key={isFiltering ? 'filtering' : 'all'}
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.35, ease: "easeOut" }}
           className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] p-5 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-5"
         >
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 ${isFiltering ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF]' : 'bg-slate-100 dark:bg-[#1C1C1E] text-slate-400'}`}>
                  {isFiltering ? <Filter size={24} strokeWidth={2.5}/> : <Briefcase size={24} strokeWidth={2.5}/>}
               </div>
               <div className="min-w-0">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                    {timeRange !== 'all' ? `Periodo: ${currentOption.label}` : 'Resumen Total del Perfil'}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 mt-0.5 uppercase tracking-widest">{filteredList.length} registros encontrados</p>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:ml-auto">
               <div className="flex flex-col items-start sm:items-end">
                  <div className="flex items-center gap-1.5 mb-0.5">
                     <ArrowUpRight size={13} className="text-emerald-500" strokeWidth={3}/>
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ingresos</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">+{formatCurrency(filteredIncome)}</span>
               </div>
               
               <div className="flex flex-col items-start sm:items-end">
                  <div className="flex items-center gap-1.5 mb-0.5">
                     <ArrowDownRight size={13} className="text-rose-400" strokeWidth={3}/>
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Egresos</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-rose-500">-{formatCurrency(filteredExpense)}</span>
               </div>

               <div className={`flex flex-col items-start sm:items-end px-4 sm:px-5 py-2.5 rounded-[18px] border shrink-0 ${filteredBalance >= 0 ? 'bg-slate-900 dark:bg-black border-slate-800 dark:border-white/10 shadow-lg' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${filteredBalance >= 0 ? 'text-slate-400' : 'text-rose-400'}`}>Balance Neto</span>
                  <span className={`text-base sm:text-lg font-black tracking-tight ${filteredBalance >= 0 ? 'text-white' : 'text-rose-600'}`}>
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
             <div className="w-12 h-12 border-4 border-slate-200 dark:border-zinc-800 border-t-[#0381FE] rounded-full animate-spin" />
             <p className="text-slate-400 font-bold animate-pulse">Cargando base de datos...</p>
           </div>
         </div>
      ) : filteredList.length === 0 ? (
         <div className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl border border-dashed border-slate-200 dark:border-white/10 rounded-[28px] p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#1C1C1E] text-slate-400 rounded-3xl flex items-center justify-center mb-4">
               <Filter size={30} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1.5">Sin resultados en este periodo</h3>
            <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-medium text-xs leading-relaxed">
               No hay transacciones registradas en "{currentOption.label}" con los filtros actuales. Puedes cambiar el filtro a "Todo el historial" para ver todos los movimientos.
            </p>
         </div>
      ) : (
         <div className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] overflow-hidden">
            <motion.div 
               variants={containerVariants}
               initial="hidden"
               animate="show"
               className="divide-y divide-black/5 dark:divide-white/5"
            >
               {filteredList.map((tx) => {
                   let txColor = 'text-slate-800 dark:text-white';
                   let bgType = 'bg-slate-100 dark:bg-zinc-800';
                   let icon = null;
                   let badgeBg = 'bg-slate-100 dark:bg-[#1C1C1E] text-slate-600 dark:text-zinc-400';
                   let sign = '';

                   if (tx.type === 'ingreso') {
                      txColor = 'text-emerald-600 dark:text-emerald-400'; bgType = 'bg-emerald-50 dark:bg-emerald-950/40';
                      icon = <ArrowUpRight size={20} className="text-emerald-500" strokeWidth={2.5}/>;
                      badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';
                      sign = '+';
                   } else if (tx.type === 'inversion') {
                      txColor = 'text-indigo-600 dark:text-indigo-400'; bgType = 'bg-indigo-50 dark:bg-indigo-950/40';
                      icon = <Briefcase size={20} className="text-indigo-500" strokeWidth={2.5} />;
                      badgeBg = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40';
                      sign = '-';
                   } else {
                      txColor = 'text-rose-600 dark:text-rose-400'; bgType = 'bg-rose-50 dark:bg-rose-950/40';
                      icon = <ArrowDownRight size={20} className="text-rose-500" strokeWidth={2.5}/>;
                      badgeBg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40';
                      sign = '-';
                   }

                   // Extract all categories (backward compatible with arrays & strings)
                   const txCategories: string[] = Array.isArray(tx.categories) && tx.categories.length > 0 
                      ? tx.categories 
                      : tx.category 
                        ? tx.category.split(',').map((c: string) => c.trim())
                        : [categories[tx.categoryId] || 'General'];

                   const isDeleting = deletingId === tx.id;

                   return (
                     <motion.div 
                        key={tx.id}
                        variants={itemVariants}
                        layout
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors group ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                     >
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 flex-1 w-full min-w-0">
                           <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-[18px] flex items-center justify-center shrink-0 ${bgType}`}>
                              {icon}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                  {/* Multi-category badges */}
                                  {txCategories.map((catName, idx) => (
                                     <span key={idx} className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 ${badgeBg}`}>
                                        <Tag size={10} />
                                        {catName}
                                     </span>
                                  ))}

                                  {tx.paymentMethod && (
                                     <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        tx.paymentMethod === 'addi' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
                                        tx.paymentMethod === 'sistecredito' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' :
                                        tx.paymentMethod === 'tarjeta' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' :
                                        tx.paymentMethod === 'apartado' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                                        'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300'
                                     }`}>
                                        {tx.paymentMethod === 'apartado' ? <Package size={10} /> : <CreditCard size={10} />}
                                        {tx.paymentMethod === 'addi' ? 'Addi' :
                                         tx.paymentMethod === 'sistecredito' ? 'Sistecrédito' :
                                         tx.paymentMethod === 'tarjeta' ? 'Tarjeta' :
                                         tx.paymentMethod === 'apartado' ? 'Apartado' : 'Contado'}
                                     </span>
                                  )}
                                  {tx.disbursementStatus && (
                                     <button
                                        type="button"
                                        onClick={(e) => handleToggleDisbursement(tx, e)}
                                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                                           tx.disbursementStatus === 'desembolsado'
                                             ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                             : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-emerald-100 hover:text-emerald-800'
                                        }`}
                                        title="Clic para cambiar estado de desembolso"
                                     >
                                        <Hourglass size={10} />
                                        {tx.disbursementStatus === 'desembolsado' ? 'Desembolsado' : 'Pendiente'}
                                     </button>
                                  )}
                                  {tx.inversionIdRelacionada && (
                                     <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        ROI
                                     </span>
                                  )}
                               </div>
                               <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 mb-1">{tx.description || <span className="text-slate-400 font-semibold italic">Monto sin descripción de detalles.</span>}</h4>
                               {tx.grossAmount && tx.commissionAmount > 0 && (
                                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 flex flex-wrap items-center gap-2">
                                     <span>Bruto: {formatCurrency(tx.grossAmount)}</span>
                                     <span>•</span>
                                     <span className="text-rose-500">Comisión ({tx.commissionRate || 0}%): -{formatCurrency(tx.commissionAmount)}</span>
                                     <span>•</span>
                                     <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Neto: {formatCurrency(tx.netAmount || tx.amount)}</span>
                                  </p>
                               )}
                               <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 uppercase tracking-wide">
                                  <Clock size={11} className="text-slate-400" />
                                  {formatDate(tx.date)}
                                </p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pl-14 sm:pl-0 w-full sm:w-auto shrink-0">
                           <div className="flex flex-col sm:items-end">
                              <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${txColor}`}>
                                 {sign}{formatCurrency(tx.amount)}
                              </span>
                              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-widest sm:text-right">{tx.type}</span>
                           </div>
                           <div className="flex items-center gap-1 shrink-0">
                           {(tx.paymentMethod === 'apartado' || Boolean(tx.separadoId) || tx.categoryId === 'abono-separado') && (
                             <button 
                               onClick={(e) => handleOpenApartadoEdit(tx, e)}
                               className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-full transition-colors shrink-0 outline-none"
                               title="Editar Apartado completo"
                             >
                                <Package size={15} strokeWidth={2.5}/>
                             </button>
                           )}
                           <button 
                             onClick={(e) => handleOpenEdit(tx, e)} 
                             className="p-2 text-slate-400 hover:text-[#0381FE] dark:hover:text-[#387AFF] hover:bg-[#0381FE]/10 rounded-full transition-colors shrink-0 outline-none"
                             title="Editar transacción"
                           >
                              <Pencil size={15} strokeWidth={2.5}/>
                           </button>
                           <button 
                             onClick={(e) => handleDelete(tx.id, e)} 
                             className="p-2 text-slate-300 dark:text-zinc-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-colors shrink-0 outline-none"
                             title="Eliminar transacción"
                           >
                              <Trash2 size={15} strokeWidth={2.5}/>
                           </button>
                           </div>
                        </div>
                     </motion.div>
                   );
               })}
            </motion.div>
         </div>
      )}

      {/* Edit Apartado Modal */}
      <EditApartadoModal 
        isOpen={Boolean(editingApartado)} 
        separado={editingApartado} 
        onClose={() => setEditingApartado(null)} 
      />

      {/* Edit Transaction Modal - Samsung One UI Bottom Sheet */}
      <AnimatePresence>
         {editingTx && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }} 
                 onClick={() => !isUpdating && setEditingTx(null)} 
                 className="absolute inset-0 bg-black/60 backdrop-blur-md" 
               />
               
               <motion.div 
                 initial={{ opacity: 0, y: 40, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 exit={{ opacity: 0, y: 40, scale: 0.98 }} 
                 transition={ONE_UI_SPRING}
                 className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden z-10 p-6 sm:p-8 border border-white/40 dark:border-white/5"
               >
                  <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />

                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Editar Transacción</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Actualiza los datos del movimiento</p>
                     </div>
                     <button onClick={() => setEditingTx(null)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                        <X size={18} />
                     </button>
                  </div>

                  <form onSubmit={handleUpdate} className="space-y-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Monto ($)</label>
                        <input 
                           type="number" 
                           step="any" 
                           required 
                           value={editMonto} 
                           onChange={e => setEditMonto(e.target.value)} 
                           className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl text-xl font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0381FE]/40" 
                        />
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Descripción</label>
                        <input 
                           type="text" 
                           value={editDesc} 
                           onChange={e => setEditDesc(e.target.value)} 
                           placeholder="Detalle del movimiento..." 
                           className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0381FE]/40" 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Categoría</label>
                           <select 
                              value={editCat} 
                              onChange={e => setEditCat(e.target.value)} 
                              className="w-full px-3 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0381FE]/40 cursor-pointer"
                           >
                              {Object.entries(categories).map(([id, name]) => (
                                 <option key={id} value={id} className="bg-white dark:bg-[#17171A]">{name}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Tipo</label>
                           <select 
                              value={editTipo} 
                              onChange={e => setEditTipo(e.target.value)} 
                              className="w-full px-3 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl font-bold text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0381FE]/40 cursor-pointer"
                           >
                              <option value="ingreso" className="bg-white dark:bg-[#17171A]">Ingreso</option>
                              <option value="gasto_fijo" className="bg-white dark:bg-[#17171A]">Gasto Fijo</option>
                              <option value="gasto_variable" className="bg-white dark:bg-[#17171A]">Gasto Variable</option>
                              <option value="gasto_innecesario" className="bg-white dark:bg-[#17171A]">Innecesario</option>
                              <option value="inversion" className="bg-white dark:bg-[#17171A]">Inversión</option>
                           </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Fecha</label>
                        <input 
                           type="date" 
                           value={editDate} 
                           onChange={e => setEditDate(e.target.value)} 
                           className="w-full px-4 py-3 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl font-bold text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0381FE]/40 cursor-pointer" 
                        />
                     </div>

                     <div className="pt-3 flex gap-3">
                        <button 
                           type="button" 
                           onClick={() => setEditingTx(null)} 
                           disabled={isUpdating} 
                           className="flex-1 py-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-2xl text-sm transition-colors active:scale-95"
                        >
                           Cancelar
                        </button>
                        <button 
                           type="submit" 
                           disabled={isUpdating} 
                           className="flex-[2] py-3.5 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50"
                        >
                           {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                        </button>
                     </div>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
         {toastMsg && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 20 }} 
               className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white font-bold text-xs px-5 py-3 rounded-full shadow-2xl z-[150] flex items-center gap-2"
            >
               <span>{toastMsg}</span>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
};
