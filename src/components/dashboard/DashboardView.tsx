import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useObligationsData } from '../../hooks/useObligationsData';
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
// import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { useSeparadosData } from '../../hooks/useSeparadosData';
import { createTransaction, updateSeparado, payRecurringExpense } from '../../lib/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Filter, Target, Package, Plus, DollarSign, X, Tag, Calendar as CalendarIcon, Clock, ChevronDown, Sunset, ShieldCheck, CheckCircle2, ChevronUp, Edit2 } from 'lucide-react';
import { MiniCalendar } from '../ui/MiniCalendar';
import { EditApartadoModal } from '../transactions/EditApartadoModal';
import { getTodayColombia, createColombiaDateTime, getColombiaRangeBounds, formatToColombiaDate } from '../../utils/dateUtils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

const startOfMonth = (_date?: Date) => getColombiaRangeBounds('this_month').start || new Date();

const getRangeDates = (range: string, customStart?: string, customEnd?: string) => {
  return getColombiaRangeBounds(range, customStart, customEnd);
};

export const DashboardView = () => {
  const { user, currentProfile } = useAppStore();
  
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Drill-down Modal State
  const [selectedDayObj, setSelectedDayObj] = useState<Date | null>(null);

  const { startStr, endStr } = useMemo(() => getRangeDates(timeRange, customStart, customEnd), [timeRange, customStart, customEnd]);
  const { transactions, categories, investments, linkedIncomes, loading } = useDashboardData(startStr, endStr);

  const navigate = useNavigate();
  const { processedObligations, loading: obsLoading } = useObligationsData();
  const { recurringExpenses } = useRecurringExpenses();
  const { separados, loading: sepLoading } = useSeparadosData();
  
  const topUrgentObs = processedObligations.filter(ob => !ob.cumplida).slice(0, 3);
  
  // const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  
  // Separados Abono UI State
  const pendingSeparados = separados.filter(s => s.estado === 'pendiente');
  const [abonoModalId, setAbonoModalId] = useState<string | null>(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [isAbonando, setIsAbonando] = useState(false);
  const [selectedEditingSeparado, setSelectedEditingSeparado] = useState<any | null>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06, ease: [0.2, 0, 0, 1] as const } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] as const } }
  };

  const handleBarClick = (data: any) => {
     if (data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        if (payload.fullDate) {
           setSelectedDayObj(payload.fullDate);
        }
     }
  };

  // KPIs
  const metrics = useMemo(() => {
    let income = 0;
    let fixedExp = 0;
    let varExp = 0;
    let unnecExp = 0;
    let investmentsTotal = 0;

    transactions.forEach(tx => {
      if (tx.type === 'ingreso') income += tx.amount;
      else if (tx.type === 'gasto_fijo') fixedExp += tx.amount;
      else if (tx.type === 'gasto_variable') varExp += tx.amount;
      else if (tx.type === 'gasto_innecesario') unnecExp += tx.amount;
      else if (tx.type === 'inversion') investmentsTotal += tx.amount;
    });
    
    const fixedPaidMonth = transactions
      .filter(tx => tx.type === 'gasto_fijo')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const fixedBudget = recurringExpenses.reduce((sum, re) => sum + re.monto, 0);
    const fixedProgress = fixedBudget > 0 ? (fixedPaidMonth / fixedBudget) * 100 : 0;

    const fixedUnpaidMonth = recurringExpenses.reduce((sum, expense) => {
       const isPaidThisMonth = transactions.some(tx => 
          tx.type === 'gasto_fijo' && 
          tx.categoryId === expense.categoryId && 
          tx.description?.includes(expense.titulo) &&
          new Date(tx.date?.toDate ? tx.date.toDate() : tx.date.seconds * 1000) >= startOfMonth(new Date())
       );
       return isPaidThisMonth ? sum : sum + expense.monto;
    }, 0);

    const balance = income - (fixedExp + varExp + unnecExp + investmentsTotal);
    const projectedBalance = balance - fixedUnpaidMonth;
    const solvencyRatio = income > 0 ? (projectedBalance / income) : 0;

    return { 
       income, 
       fixedExp, 
       varExp, 
       unnecExp, 
       investmentsTotal, 
       fixedPaidMonth,
       fixedBudget,
       fixedProgress,
       fixedUnpaidMonth,
       projectedBalance,
       solvencyRatio,
       balance 
    };
  }, [transactions, recurringExpenses]);

  // Pending Recurring Expenses (Removed)
  // const totalPendingRec = useMemo(() => pendingRecurring.reduce((sum, exp) => sum + exp.monto, 0), [pendingRecurring]);
  // const projectedBalance = metrics.balance - totalPendingRec;

  // const handlePayFixedExpense = async (expense: any) => { ... };

  const handleAbonoSubmit = async (separado: any) => {
     if (!user || !currentProfile || !abonoMonto || Number(abonoMonto) <= 0) return;
     setIsAbonando(true);
     try {
        const amount = Number(abonoMonto);
        const newTotal = separado.totalAbonado + amount;
        const txId = crypto.randomUUID();
        const nowColombia = createColombiaDateTime(getTodayColombia());

        // Registrar ingreso del abono
        await createTransaction(user.uid, currentProfile.id, txId, {
           amount,
           type: 'ingreso',
           categoryId: 'abono-separado',
           date: nowColombia,
           description: `Abono a separado: ${separado.cliente}`,
        });

        const isCompleted = newTotal >= separado.valorTotal;
        await updateSeparado(user.uid, currentProfile.id, separado.id, {
           totalAbonado: newTotal,
           estado: isCompleted ? 'completado' : 'pendiente'
        });

        if (isCompleted) {
           // Celebration would happen here
        }

        setAbonoModalId(null);
        setAbonoMonto('');
     } catch(e) {
        console.error(e);
     } finally {
        setIsAbonando(false);
     }
  };

  // Daily Evolution Composed Chart
  const dailyEvolutionData = useMemo(() => {
    const rangeStart = new Date(startStr);
    const rangeEnd = new Date(endStr);

    const dayMap: Record<string, { income: number, expense: number, dateObj: Date }> = {};
    
    // Safety net against massive date ranges breaking the loop (cap at 365 days)
    const diffTime = Math.abs(rangeEnd.getTime() - rangeStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = Math.max(1, Math.min(diffDays, 365));
    
    // Fill all days to ensure unbroken timeline using Colombia timezone
    let curr = new Date(rangeStart.getTime() + 1000 * 60 * 60 * 5); // Shift to noon COT
    for (let i = 0; i < safeDays; i++) {
       const key = curr.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
       // Use a stable snapshot of the date
       dayMap[key] = { income: 0, expense: 0, dateObj: new Date(curr) };
       curr.setDate(curr.getDate() + 1);
    }

    transactions.forEach(tx => {
       const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
       if (txDate >= rangeStart && txDate <= rangeEnd) {
          const key = txDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
          if (dayMap[key]) {
             if (tx.type === 'ingreso') {
                dayMap[key].income += tx.amount;
             } else if (tx.type === 'gasto_fijo' || tx.type === 'gasto_variable' || tx.type === 'gasto_innecesario') {
                dayMap[key].expense += tx.amount;
             }
          }
       }
    });

    return Object.entries(dayMap).map(([day, data]) => ({
       day,
       fullDate: data.dateObj,
       Ingresos: data.income,
       Balance: data.income - data.expense
    })).sort((a,b) => a.fullDate.getTime() - b.fullDate.getTime());

  }, [transactions, startStr, endStr]);

  // Bar Chart: Income by Day of the Week (Lunes a Domingo)
  const weekdaysChart = useMemo(() => {
    const acc = [0,0,0,0,0,0,0]; // Dom is 0
    const dayIdxMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    transactions.forEach(tx => {
      if (tx.type === 'ingreso') {
        const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Bogota' });
        const dayIdx = dayIdxMap[dayStr] ?? d.getDay();
        acc[dayIdx] += tx.amount;
      }
    });
    const ordered = [
       { day: 'Lunes', Income: acc[1] },
       { day: 'Martes', Income: acc[2] },
       { day: 'Miércoles', Income: acc[3] },
       { day: 'Jueves', Income: acc[4] },
       { day: 'Viernes', Income: acc[5] },
       { day: 'Sábado', Income: acc[6] },
       { day: 'Domingo', Income: acc[0] },
    ];
    return ordered;
  }, [transactions]);

  // Pie Chart: Top Incomes by Category
  const pieData = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const catMap = categories.reduce((map, c) => ({ ...map, [c.id]: c.name }), {} as Record<string, string>);
    
    transactions.forEach(tx => {
      if (tx.type === 'ingreso') {
        const catName = catMap[tx.categoryId] || 'Otros (General)';
        incomeMap[catName] = (incomeMap[catName] || 0) + tx.amount;
      }
    });

    const sorted = Object.entries(incomeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);

    // Only keep top 5, merge others into "Otros"
    if (sorted.length > 5) {
       const top5 = sorted.slice(0, 5);
       const othersVal = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
       return [...top5, { name: 'Otros', value: othersVal }];
    }
    return sorted;
  }, [transactions, categories]);

  // ROI Logic
  const roiData = useMemo(() => {
     if (currentProfile?.type !== 'Business') return [];
     
     const rangeStart = new Date(startStr);
     const rangeEnd = new Date(endStr);
     
     const rangeInvs = investments.filter(inv => {
        const d = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date.seconds * 1000);
        return d >= rangeStart && d <= rangeEnd;
     });

     return rangeInvs.map(inv => {
        const recovered = linkedIncomes
           .filter(inc => inc.inversionIdRelacionada === inv.id)
           .reduce((sum, inc) => sum + inc.amount, 0);
        
        return {
           ...inv,
           recovered,
           percentage: Math.min((recovered / inv.amount) * 100, 100).toFixed(1)
        };
     }).sort((a,b) => Number(b.percentage) - Number(a.percentage));
  }, [investments, linkedIncomes, currentProfile, startStr, endStr]);

  // Selected Day Transactions for Modal
  const selectedDayTransactions = useMemo(() => {
     if (!selectedDayObj) return [];
     const targetDayStr = formatToColombiaDate(selectedDayObj);
     
     return transactions.filter(tx => {
         return formatToColombiaDate(tx.date) === targetDayStr;
     }).sort((a,b) => {
         const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date.seconds * 1000);
         const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date.seconds * 1000);
         return dB.getTime() - dA.getTime();
     });
  }, [selectedDayObj, transactions]);

  const catMap = useMemo(() => categories.reduce((m, c) => ({ ...m, [c.id]: c.name }), {} as Record<string, string>), [categories]);

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

  const handleRangeSelect = useCallback((val: string) => {
    setTimeRange(val);
    if (val !== 'custom') setShowDropdown(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const rangeOptions = [
    { value: 'today',       label: 'Hoy',             icon: Clock },
    { value: 'last_7_days', label: 'Últimos 7 días',  icon: Filter },
    { value: 'this_month',  label: 'Este mes',         icon: CalendarIcon },
    { value: 'last_month',  label: 'Mes pasado',       icon: Sunset },
    { value: 'custom',      label: 'Personalizado...', icon: ChevronDown },
  ];

  const currentOption = rangeOptions.find(o => o.value === timeRange) ?? rangeOptions[2];

  // const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  // const urgentProjects = projects.filter(p => p.progress < 100 && p.daysRemaining <= 2);
  // const urgentObligations = processedObligations.filter(o => !o.cumplida && o.daysRemaining <= 2);
  
  // const timelineItems = [
  //    ...urgentProjects.map(p => ({ id: p.id, type: 'proyecto', title: p.titulo, days: p.daysRemaining })),
  //    ...urgentObligations.map(o => ({ id: o.id, type: 'meta', title: o.titulo, days: o.daysRemaining }))
  // ].sort((a, b) => a.days - b.days);

  return (
    <>
    <div className="w-full relative pb-24">
      
      {/* HEADER SECTION (Date Range Filters, Actions) - One UI 9.0 Ergonomics */}
      <div className="pt-2 sm:pt-6 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-5 w-full">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#0381FE]/12 dark:bg-[#0381FE]/20 text-[#0381FE] dark:text-[#387AFF]">
                {currentProfile?.name || 'SofiLu'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1">Resumen financiero y métricas en tiempo real</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start sm:items-center">
            {/* ── Custom Floating Popover Filter ─────────────────── */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>

              {/* Pill Trigger */}
              <motion.button
                onClick={() => setShowDropdown(prev => !prev)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2.5 bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl border border-white/40 dark:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.1)] rounded-full px-4 sm:px-5 py-2.5 w-full sm:w-auto cursor-pointer hover:shadow-md transition-all h-12"
              >
                <Filter size={16} className="text-[#0381FE] dark:text-[#387AFF] shrink-0" />
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm whitespace-nowrap">{currentOption.label}</span>
                  {timeRange === 'custom' && customStart && customEnd && (
                    <span className="text-[10px] font-bold text-[#0381FE] dark:text-[#387AFF] bg-[#0381FE]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {customStart.slice(5)} → {customEnd.slice(5)}
                    </span>
                  )}
                </div>
                <motion.div 
                  className="ml-auto"
                  animate={{ rotate: showDropdown ? 180 : 0 }} 
                  transition={{ duration: 0.18 }}
                >
                  <ChevronDown size={15} className="text-[#0381FE] dark:text-[#387AFF]" />
                </motion.div>
              </motion.button>

              {/* Animated Popover Menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    className="absolute right-0 mt-2 w-64 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 z-[200] p-2 overflow-hidden"
                    style={{ transformOrigin: 'top right' }}
                  >
                    {/* Range Options */}
                    {rangeOptions.map((opt) => {
                      const IconComp = opt.icon;
                      const isActive = timeRange === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleRangeSelect(opt.value)}
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
                          <span className="font-bold text-sm">{opt.label}</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0381FE] dark:bg-[#387AFF]" />}
                        </button>
                      );
                    })}

                    {/* ── Custom Date Range Panel (Floating UI Calendar) ── */}
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
                            <div className="flex flex-col gap-2 mb-3">
                              {/* Trigger Buttons for Calendar Selection */}
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

                              {/* Inline Custom Calendar */}
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

                              {/* Apply button */}
                              <motion.button
                                onClick={() => {
                                  if (customStart && customEnd) setShowDropdown(false);
                                }}
                                whileTap={{ scale: 0.96 }}
                                disabled={!customStart || !customEnd}
                                className="w-full py-3 bg-[#0381FE] hover:bg-[#026cd5] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm transition-colors mt-1 shadow-lg shadow-[#0381FE]/25"
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
          </div>{/* end flex filter wrapper */}
        </div>{/* end header section */}

            {/* Separados / Layaways Widget */}
            {!sepLoading && pendingSeparados.length > 0 && (
               <motion.div variants={itemVariants} className="w-full mt-4 mb-4">
                  <div className="flex justify-between items-center mb-6 pl-2">
                     <div>
                       <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                          <Package className="text-emerald-500" strokeWidth={2.5}/>
                          Productos Separados (Pendientes)
                       </h3>
                       <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1">Sigue el progreso de abonos de tus clientes.</p>
                     </div>
                  </div>

                  <div className="flex overflow-x-auto gap-5 pb-4 custom-scrollbar snap-x snap-mandatory">
                     {pendingSeparados.map(sep => {
                        const falta = sep.valorTotal - sep.totalAbonado;
                        const progress = Math.min(100, Math.max(0, (sep.totalAbonado / sep.valorTotal) * 100));

                        return (
                           <div key={sep.id} className="snap-start shrink-0 w-72 sm:w-80 bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] flex flex-col relative overflow-hidden group hover:shadow-lg transition-all">
                              {/* Background subtle color */}
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

                              <div className="flex items-start gap-4 mb-4 relative z-10">
                                 {sep.fotoUrl ? (
                                    <div className="w-16 h-16 rounded-[20px] bg-slate-100 dark:bg-zinc-800 shrink-0 overflow-hidden border border-black/5 dark:border-white/5">
                                       <img src={sep.fotoUrl} alt={sep.cliente} className="w-full h-full object-cover" />
                                    </div>
                                 ) : (
                                    <div className="w-16 h-16 rounded-[20px] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5 text-slate-300 dark:text-zinc-600">
                                       <Package size={24} strokeWidth={1.5} />
                                    </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-[15px] truncate">{sep.cliente}</h4>
                                    <p className="text-[12px] font-bold text-slate-400 dark:text-zinc-500 tracking-wide mt-0.5">TOTAL: {formatCurrency(sep.valorTotal)}</p>
                                 </div>
                                 <button
                                    type="button"
                                    onClick={() => setSelectedEditingSeparado(sep)}
                                    className="p-2 text-slate-400 dark:text-zinc-500 hover:text-[#0381FE] dark:hover:text-[#387AFF] hover:bg-[#0381FE]/10 rounded-xl transition-all shrink-0 active:scale-90"
                                    title="Editar Apartado (Total, Abonos, Liquidar)"
                                 >
                                    <Edit2 size={16} />
                                 </button>
                              </div>

                              <div className="relative z-10 mb-5">
                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                    <span className="text-emerald-600 dark:text-emerald-400 truncate">{formatCurrency(sep.totalAbonado)}</span>
                                    <span className="text-slate-400 dark:text-zinc-500">Falta {formatCurrency(falta)}</span>
                                 </div>
                                 <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner relative">
                                    <motion.div 
                                       className="h-full absolute left-0 top-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                       initial={{ width: 0 }}
                                       animate={{ width: `${progress}%` }}
                                       transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                 </div>
                              </div>

                              <div className="mt-auto relative z-10">
                                 {abonoModalId === sep.id ? (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 dark:bg-zinc-800/90 rounded-[20px] p-3.5 border border-black/5 dark:border-white/10 shadow-sm flex flex-col gap-2.5">
                                       <div className="flex gap-2">
                                          <div className="relative flex-1">
                                             <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                <DollarSign size={14} className="text-slate-400" />
                                             </div>
                                             <input 
                                                type="number"
                                                autoFocus
                                                value={abonoMonto}
                                                onChange={e => setAbonoMonto(e.target.value)}
                                                className="w-full pl-7 pr-3 py-2 text-sm font-bold bg-white dark:bg-[#17171A] text-slate-900 dark:text-white border border-black/5 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                placeholder="Monto a abonar"
                                             />
                                          </div>
                                       </div>
                                       <div className="flex gap-2">
                                          <button 
                                             onClick={() => { setAbonoModalId(null); setAbonoMonto(''); }}
                                             className="flex-1 py-2 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                                          >
                                             Cancelar
                                          </button>
                                          <button 
                                             onClick={() => handleAbonoSubmit(sep)}
                                             disabled={isAbonando || !abonoMonto}
                                             className="flex-1 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                          >
                                             {isAbonando ? '...' : 'Abonar'}
                                          </button>
                                       </div>
                                    </motion.div>
                                 ) : (
                                    <button 
                                       onClick={() => setAbonoModalId(sep.id)}
                                       className="w-full py-3.5 flex items-center justify-center gap-2 bg-slate-50 dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-zinc-300 font-bold text-sm rounded-[20px] transition-all border border-black/5 dark:border-white/5 active:scale-[0.96]"
                                    >
                                       <Plus size={16} strokeWidth={2.5}/> Añadir Abono
                                    </button>
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </motion.div>
            )}
            
        <AnimatePresence mode="wait">
        {loading || obsLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-64 w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">Cargando métricas...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="content" variants={containerVariants} initial="hidden" animate="show" className="w-full relative lg:grid lg:grid-cols-3 lg:gap-6">
            
            {/* LADO IZQUIERDO: CONTENIDO PRINCIPAL (Flujo, Gráficos, Responsabilidades) */}
            <div className="lg:col-span-2 space-y-10">
              
              {/* Evolución Diaria (Area Chart) */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01 }} 
                className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 md:p-8 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] w-full transition-material group"
              >
                <div className="mb-8">
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Evolución Diaria</h3>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">Flujo de Caja Real</p>
                </div>
                <div className="h-[320px] w-full cursor-pointer ml-[-10px] md:ml-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyEvolutionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} onClick={handleBarClick}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0381FE" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#0381FE" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={12} minTickGap={30} />
                        <YAxis axisLine={false} tickLine={false} width={50} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                        <RechartsTooltip 
                          cursor={{ stroke: 'rgba(3, 129, 254, 0.25)', strokeWidth: 2, strokeDasharray: '4 4' }} 
                          contentStyle={{ borderRadius: '1.2rem', border: 'none', backgroundColor: '#17171A', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', transition: 'all 250ms cubic-bezier(0.2, 0, 0, 1)' }}
                          formatter={(value: any, _name: any) => [formatCurrency(Number(value)), 'Neto']}
                          labelStyle={{ fontWeight: 'bold', color: '#93c5fd', marginBottom: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Balance" 
                          stroke="#0381FE" 
                          strokeWidth={4} 
                          fillOpacity={1} 
                          fill="url(#colorBalance)" 
                          isAnimationActive={true}
                          animationBegin={100}
                          animationDuration={1500}
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Responsabilidades Próximas - Formato Tabla Lista */}
              <motion.div variants={itemVariants} className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 md:p-8 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] w-full">
                <div className="flex justify-between items-center mb-6 pl-2">
                   <div>
                     <h3 className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Tus Objetivos</h3>
                     <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Top Performers</h2>
                   </div>
                </div>

                {obsLoading ? (
                   <div className="flex justify-center items-center h-24">
                     <div className="w-8 h-8 border-4 border-slate-100 dark:border-zinc-800 border-t-[#0381FE] rounded-full animate-spin" />
                   </div>
                ) : topUrgentObs.length === 0 ? (
                   <div className="border border-dashed border-black/10 dark:border-white/10 rounded-[24px] p-8 text-center flex flex-col items-center">
                      <p className="text-slate-400 dark:text-zinc-500 font-bold mb-4">Mesa limpia. No hay metas pendientes.</p>
                      <button onClick={() => navigate('/obligations')} className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95">
                         + Crear nueva meta
                      </button>
                   </div>
                ) : (
                   <div className="flex flex-col gap-3">
                      {topUrgentObs.map(ob => {
                         const isUrgent = ob.daysRemaining <= 5;
                         return (
                            <div 
                               key={ob.id} 
                               onClick={() => navigate('/obligations')}
                               className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1C1C1E] rounded-[20px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md border active:scale-[0.98] ${
                                  isUrgent ? 'border-orange-100 dark:border-orange-950/40 hover:border-orange-200' : 'border-black/[0.03] dark:border-white/[0.04]'
                               }`}
                            >
                               <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                 <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-zinc-800 text-slate-400 shadow-sm'}`}>
                                    <Target size={20} strokeWidth={2.5}/>
                                 </div>
                                 <div className="flex flex-col">
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-[15px] line-clamp-1">{ob.titulo}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className={`text-[10px] font-black uppercase tracking-widest ${isUrgent ? 'text-orange-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                                          {ob.daysRemaining === 0 ? 'Vence hoy' : `Faltan ${ob.daysRemaining}d`}
                                       </span>
                                    </div>
                                 </div>
                               </div>
                                
                               <div className="w-[120px] flex flex-col items-end shrink-0">
                                  <span className={`text-[12px] font-black ${ob.isGoodTrend ? 'text-emerald-500' : 'text-[#0381FE] dark:text-[#387AFF]'} mb-1.5`}>{ob.progress.toFixed(0)}%</span>
                                  <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden relative">
                                     <motion.div 
                                        className={`h-full absolute left-0 top-0 rounded-full ${ob.isGoodTrend ? 'bg-emerald-500' : 'bg-[#0381FE]'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${ob.progress}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                     />
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                )}
              </motion.div>
            </div>

            {/* LADO DERECHO: CONTEXTO GENERAL & BALANCE */}
            <div className="flex flex-col gap-6">
               {/* Balance Neto Card */}
               <motion.div 
                 variants={itemVariants} 
                 whileHover={{ y: -4, scale: 1.01 }} 
                 className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 sm:p-8 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] transition-material group"
               >
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h3 className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Tu Dinero</h3>
                        <p className="text-[15px] font-bold text-slate-600 dark:text-zinc-300">Balance Neto Actual</p>
                     </div>
                     <div className="p-3 bg-[#0381FE]/10 text-[#0381FE] dark:text-[#387AFF] rounded-[16px]"><DollarSign size={20} strokeWidth={3}/></div>
                  </div>
                  
                  <div className="space-y-1 mb-8">
                     <span className={`text-3xl min-[340px]:text-4xl sm:text-5xl font-black tracking-tighter break-all sm:break-normal truncate block ${metrics.balance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                        {formatCurrency(metrics.balance)}
                     </span>
                     
                     <div className="flex flex-col gap-2 pt-4">
                        <div className="flex items-center justify-between">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Saldo Libre Proyectado</span>
                              <span className={`text-xl font-extrabold ${metrics.projectedBalance < 0 ? 'text-rose-500' : 'text-[#0381FE] dark:text-[#387AFF]'}`}>
                                 {formatCurrency(metrics.projectedBalance)}
                              </span>
                           </div>
                           
                           {metrics.fixedUnpaidMonth > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 px-3 py-1.5 rounded-xl flex flex-col items-end shrink-0"
                              >
                                 <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Comprometido</span>
                                 <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">-{formatCurrency(metrics.fixedUnpaidMonth)}</span>
                              </motion.div>
                           )}
                        </div>

                        {/* Termómetro de Solvencia */}
                        <div className="mt-2">
                           <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Termómetro de Solvencia</span>
                              <span className={`text-[9px] font-black uppercase ${
                                 metrics.solvencyRatio > 0.2 ? 'text-emerald-500' : 
                                 metrics.solvencyRatio > 0 ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                 {metrics.solvencyRatio > 0.2 ? 'Alta' : metrics.solvencyRatio > 0 ? 'Media' : 'Crítica'}
                              </span>
                           </div>
                           <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner relative">
                              <motion.div 
                                 className={`h-full absolute left-0 top-0 rounded-full ${
                                    metrics.solvencyRatio > 0.2 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                                    metrics.solvencyRatio > 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                                    'bg-gradient-to-r from-rose-400 to-rose-500'
                                 }`}
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.max(0, Math.min(100, metrics.solvencyRatio * 100))}%` }}
                                 transition={{ duration: 1.2, ease: "easeOut" }}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                     <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Ingresos Mes</span>
                        <span className="text-[15px] font-extrabold text-emerald-500">{formatCurrency(metrics.income)}</span>
                     </div>
                     <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Gastos Mes</span>
                        <span className="text-[15px] font-extrabold text-slate-600 dark:text-zinc-400">-{formatCurrency(metrics.fixedExp + metrics.varExp + metrics.unnecExp)}</span>
                     </div>
                  </div>
               </motion.div>

               {/* Gastos Fijos (Recurring) Progress Card - Evolución Acordeón */}
               <motion.div 
                 variants={itemVariants} 
                 className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] transition-material group overflow-hidden"
               >
                  <div 
                    onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    className="p-8 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div>
                           <h3 className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">Obligaciones</h3>
                           <p className="text-[15px] font-bold text-slate-600 dark:text-zinc-300">Centro de Control de Deuda</p>
                        </div>
                        <div className="flex gap-2">
                           <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-[16px]"><ShieldCheck size={20} strokeWidth={3}/></div>
                           <div className="p-3 bg-slate-50 dark:bg-zinc-800 text-slate-400 rounded-[16px]">
                              {isAccordionOpen ? <ChevronUp size={20} strokeWidth={3}/> : <ChevronDown size={20} strokeWidth={3}/>}
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl min-[340px]:text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate">
                           {formatCurrency(metrics.fixedPaidMonth)}
                        </span>
                        <span className="text-sm font-bold text-slate-400 dark:text-zinc-500">
                           / {formatCurrency(metrics.fixedBudget)}
                        </span>
                     </div>

                     {/* Main Progress Bar */}
                     <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                           <span className="text-indigo-600 dark:text-indigo-400">{metrics.fixedProgress.toFixed(0)}% cubierto este mes</span>
                           <span className={isAccordionOpen ? "text-indigo-500 font-bold" : "text-slate-400 dark:text-zinc-500"}>
                              {isAccordionOpen ? "Cerrar detalles" : "Ver obligaciones"}
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden shadow-inner relative">
                           <motion.div 
                              className="h-full absolute left-0 top-0 rounded-full bg-gradient-to-r from-indigo-500 to-[#0381FE]"
                              initial={{ width: 0 }}
                              animate={{ width: `${metrics.fixedProgress}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                           />
                        </div>
                     </div>
                  </div>

                  <AnimatePresence>
                     {isAccordionOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-8 pb-8 border-t border-slate-100 pt-6 bg-slate-50/30"
                        >
                           <div className="space-y-4">
                              {recurringExpenses.length === 0 ? (
                                 <p className="text-center text-xs text-slate-400 font-bold py-4">No hay obligaciones configuradas.</p>
                              ) : recurringExpenses.map(expense => {
                                 const isPaidThisMonth = transactions.some(tx => 
                                    tx.type === 'gasto_fijo' && 
                                    tx.categoryId === expense.categoryId && 
                                    tx.description?.includes(expense.titulo) &&
                                    new Date(tx.date?.toDate ? tx.date.toDate() : tx.date.seconds * 1000) >= startOfMonth(new Date())
                                 );

                                 const handlePay = async (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (isPaidThisMonth || payingId) return;
                                    if (!user || !currentProfile) return;
                                    
                                    setPayingId(expense.id);
                                    try {
                                       await payRecurringExpense(user.uid, currentProfile.id, expense);
                                    } catch(err) {
                                       console.error(err);
                                    } finally {
                                       setPayingId(null);
                                    }
                                 };

                                 return (
                                    <div key={expense.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group/item">
                                       <div className="flex items-center gap-4">
                                          <button 
                                            onClick={handlePay}
                                            disabled={isPaidThisMonth || payingId === expense.id}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                              isPaidThisMonth 
                                              ? 'bg-emerald-50 text-emerald-500 border-emerald-100' 
                                              : 'bg-slate-50 text-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-500 border-transparent shadow-sm'
                                            } border shrink-0`}
                                          >
                                             {payingId === expense.id ? (
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                             ) : isPaidThisMonth ? (
                                                <CheckCircle2 size={20} strokeWidth={3}/>
                                             ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-200 group-hover/item:border-blue-300" />
                                             )}
                                          </button>

                                          <div className="flex-1 min-w-0">
                                             <div className="flex justify-between items-center mb-1">
                                                <h4 className={`text-sm font-black truncate ${isPaidThisMonth ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                                   {expense.titulo}
                                                </h4>
                                                <span className={`text-sm font-black ${isPaidThisMonth ? 'text-slate-400' : 'text-slate-800'}`}>
                                                   {formatCurrency(expense.monto)}
                                                </span>
                                             </div>
                                             
                                             <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${expense.isRecurring ? 'bg-blue-50 text-blue-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                   {expense.isRecurring ? 'Recurrente' : 'Deuda'}
                                                </span>
                                                {!expense.isRecurring && expense.totalInstallments && (
                                                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                                                      Cuota {Math.min(expense.totalInstallments, (expense.paidInstallments || 0) + (isPaidThisMonth ? 0 : 0))} de {expense.totalInstallments}
                                                   </span>
                                                )}
                                                {isPaidThisMonth && (
                                                   <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                      Pagado
                                                   </span>
                                                )}
                                             </div>

                                             {/* Deuda Progress Bar Secondary */}
                                             {!expense.isRecurring && expense.totalAmount && (
                                                <div className="mt-3">
                                                   <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mb-1">
                                                      <span>Liquidación total</span>
                                                      <span>{((1 - (expense.remainingAmount || 0) / expense.totalAmount) * 100).toFixed(0)}%</span>
                                                   </div>
                                                   <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                                      <motion.div 
                                                         className="h-full bg-indigo-400 rounded-full"
                                                         initial={{ width: 0 }}
                                                         animate={{ width: `${(1 - (expense.remainingAmount || 0) / expense.totalAmount) * 100}%` }}
                                                      />
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                           
                           <p className="mt-6 text-[11px] font-medium text-slate-400 leading-relaxed text-center italic">
                              Usa los checks para registrar tus pagos al instante. El balance neto se ajustará automáticamente.
                           </p>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </motion.div>
            </div> {/* End Right Sidebar */}
            {/* Fin 3-Column Layout */}

          <div className="lg:col-span-3 mt-6 w-full">
            {/* Charts Module Baseline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart: Mejores Dias */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01 }} 
                className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 md:p-8 pt-8 pb-10 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] lg:col-span-2 transition-material group"
              >
                <div className="mb-10">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Análisis de Mejores Días</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-zinc-500 mt-1">Distribución histórica de Ingresos según el día de la semana</p>
                </div>
                <div className="h-[280px] w-full border-t border-black/5 dark:border-white/5 pt-6 ml-[-15px] md:ml-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdaysChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={12} />
                        <YAxis axisLine={false} tickLine={false} width={45} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                        <RechartsTooltip 
                          cursor={{ fill: 'rgba(3, 129, 254, 0.05)' }} 
                          contentStyle={{ borderRadius: '1.2rem', border: 'none', backgroundColor: '#17171A', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}
                          formatter={(value: any) => formatCurrency(Number(value))}
                          labelStyle={{ fontWeight: 'bold', color: '#93c5fd', marginBottom: '8px' }}
                        />
                        <Bar 
                          dataKey="Income" 
                          name="Ingresos"
                          fill="#0381FE" 
                          radius={[8, 8, 8, 8]} 
                          barSize={32}
                          isAnimationActive={true}
                          animationBegin={200}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                           {weekdaysChart.map((entry, index) => {
                              const maxIncome = Math.max(...weekdaysChart.map(d => d.Income));
                              const opacity = entry.Income === maxIncome && entry.Income > 0 ? 1 : 0.6;
                              return <Cell key={`cell-${index}`} fill="#0381FE" fillOpacity={opacity} />;
                           })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              </motion.div>

              {/* PIE CHART: CATEGORIAS */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01 }} 
                className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 md:p-8 pt-8 pb-10 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/[0.08] flex flex-col justify-center items-center transition-material group"
              >
                <div className="mb-6">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Top Categorías</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-zinc-500 mt-1">Fuentes de mayores ingresos</p>
                </div>
                <div className="flex-1 h-[300px] w-full relative mt-2 border-t border-black/5 dark:border-white/5">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                             data={pieData}
                             cx="50%"
                             cy="50%"
                             innerRadius={65}
                             outerRadius={85}
                             paddingAngle={8}
                             dataKey="value"
                             stroke="none"
                             isAnimationActive={true}
                             animationBegin={400}
                             animationDuration={1000}
                             animationEasing="ease-out"
                          >                   
                          {pieData.map((_entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any) => {
                             const total = pieData.reduce((sum, item) => sum + item.value, 0);
                             const percentage = ((Number(value) / total) * 100).toFixed(1);
                             return [`${formatCurrency(Number(value))} (${percentage}%)`];
                          }}
                          contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#17171A', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} 
                          itemStyle={{ fontWeight: 'bold', color: '#fff' }}
                        />
                        <Legend 
                           verticalAlign={isDesktop ? "middle" : "bottom"}
                           layout={isDesktop ? "vertical" : "horizontal"}
                           align={isDesktop ? "right" : "center"}
                           iconType="circle" 
                           wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', paddingBottom: isDesktop ? '0' : '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-zinc-500 text-sm font-bold bg-slate-50/50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-black/10 dark:border-white/10">Sin ingresos detectados</div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Responsabilidades Próximas */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="flex justify-between items-center mb-6 pl-2">
                 <div>
                   <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Responsabilidades Próximas</h3>
                   <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1">Sigue el progreso de ventas hacia tus metas más urgentes.</p>
                 </div>
              </div>

              {obsLoading ? (
                 <div className="flex justify-center items-center h-24">
                   <div className="w-8 h-8 border-4 border-slate-100 dark:border-zinc-800 border-t-[#0381FE] rounded-full animate-spin" />
                 </div>
              ) : topUrgentObs.length === 0 ? (
                 <div className="bg-white dark:bg-[#17171A] border border-dashed border-black/10 dark:border-white/10 rounded-[28px] p-8 text-center shadow-sm dark:shadow-none flex flex-col items-center">
                    <p className="text-slate-400 dark:text-zinc-500 font-bold mb-4">No tienes responsabilidades pendientes o próximas.</p>
                    <button onClick={() => navigate('/obligations')} className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95">
                       + Crear nueva meta
                    </button>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {topUrgentObs.map(ob => {
                       const isUrgent = ob.daysRemaining <= 5;
                       return (
                          <div 
                             key={ob.id} 
                             onClick={() => navigate('/obligations')}
                             className={`bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl rounded-[28px] p-5 sm:p-6 cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.15)] border transition-all hover:-translate-y-1 hover:shadow-lg group active:scale-[0.98] ${
                                isUrgent ? 'border-orange-100 dark:border-orange-950/40' : 'border-none dark:border dark:border-white/5 hover:border-[#0381FE]/30'
                             }`}
                          >
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-500' : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 group-hover:bg-[#0381FE]/10 group-hover:text-[#0381FE]'}`}>
                                     <Target size={18} strokeWidth={2.5}/>
                                  </div>
                                  <h4 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{ob.titulo}</h4>
                               </div>
                               <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isUrgent ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400' : 'bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'}`}>
                                  {ob.daysRemaining === 0 ? 'Vence hoy' : `Faltan ${ob.daysRemaining}d`}
                               </div>
                             </div>
                             
                             <div>
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                   <span className="text-slate-400 dark:text-zinc-500">Progreso</span>
                                   <span className={ob.isGoodTrend ? 'text-emerald-500' : 'text-[#0381FE] dark:text-[#387AFF]'}>{ob.progress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner relative">
                                   <motion.div 
                                      className={`h-full absolute left-0 top-0 rounded-full ${ob.isGoodTrend ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-[#0381FE] to-[#387AFF]'}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${ob.progress}%` }}
                                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                   />
                                </div>
                             </div>
                          </div>
                       );
                    })}
                 </div>
              )}
            </motion.div>

            {/* ROI Módulo Inteligente (Negocios) - Optional view if they still want it here */}
            {/* ROI Módulo Inteligente (Negocios) */}
            {currentProfile?.type === 'Business' && (
              <motion.div variants={itemVariants} className="bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl p-6 md:p-8 rounded-[28px] border border-white/40 dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Recuperación de Inversión (ROI)</h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mt-1">Sigue el porcentaje de retorno de lo invertido en este periodo.</p>
                  </div>
                </div>
                
                {roiData.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-[#1C1C1E] p-6 rounded-[24px] border border-black/5 dark:border-white/5 text-center">
                      <p className="text-slate-400 dark:text-zinc-500 text-sm font-bold">No hay inversiones iniciales registradas en este periodo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {roiData.map(inv => (
                        <div key={inv.id} className="bg-slate-50 dark:bg-[#1C1C1E] p-5 md:p-6 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{inv.description || "Capital Base"}</span>
                            <span className="text-xs font-black text-[#0381FE] dark:text-[#387AFF] bg-[#0381FE]/10 px-3 py-1 rounded-full">{inv.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                            <motion.div 
                                className="bg-gradient-to-r from-indigo-500 to-[#0381FE] h-4 rounded-full relative" 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${Math.min(parseInt(inv.percentage), 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                            </motion.div>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-zinc-400">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Invertido</span>
                              <span className="text-slate-900 dark:text-white">{formatCurrency(inv.amount)}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-right">
                              <span className="text-[10px] uppercase text-indigo-400 tracking-wider">Retornado</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(inv.recovered)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Daily Transactions Modal - Samsung One UI Bottom Sheet */}
      <AnimatePresence>
        {selectedDayObj && (
           <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
               onClick={() => setSelectedDayObj(null)} 
               className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer" 
             />
             <motion.div 
               initial={{ y: '100%', opacity: 0 }} 
               animate={{ y: 0, opacity: 1 }} 
               exit={{ y: '100%', opacity: 0 }} 
               transition={{ type: "spring", stiffness: 380, damping: 30 }}
               className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden z-10 max-h-[88vh] flex flex-col border border-white/40 dark:border-white/5"
             >
               {/* One UI Drag Handle */}
               <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" onClick={() => setSelectedDayObj(null)} />

               <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-start mb-6 sticky top-0 bg-transparent pt-1 pb-4 z-10 border-b border-black/[0.04] dark:border-white/[0.05]">
                     <div>
                       <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Cierre del Día</h3>
                       <p className="text-slate-500 font-bold mt-1 text-sm bg-[#0381FE]/10 text-[#0381FE] dark:text-[#387AFF] inline-block px-3 py-1 rounded-full uppercase tracking-widest">
                          {selectedDayObj?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })}
                       </p>
                     </div>
                     <button onClick={() => setSelectedDayObj(null)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 rounded-full transition-colors flex-shrink-0 active:scale-90">
                        <X size={18} />
                     </button>
                  </div>

                  <div className="space-y-3">
                     {selectedDayTransactions.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center">
                          <p className="text-slate-500 font-bold">No hay transacciones registradas.</p>
                        </div>
                     ) : (
                        selectedDayTransactions.map(tx => {
                           // Type Styles
                           let txColor = 'text-slate-600', bgType = 'bg-slate-50', icon = null;
                           if (tx.type === 'ingreso') {
                              txColor = 'text-emerald-600'; bgType = 'bg-emerald-50';
                              icon = <ArrowUpRight size={16} />;
                           } else if (tx.type === 'inversion') {
                              txColor = 'text-indigo-600'; bgType = 'bg-indigo-50';
                           } else {
                              txColor = 'text-amber-600'; bgType = 'bg-amber-50';
                              icon = <ArrowDownRight size={16} />;
                           }

                           return (
                             <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-sm transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgType} ${txColor}`}>
                                      {icon ? icon : <Tag size={16} />}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-extrabold text-slate-800 text-sm max-w-[150px] sm:max-w-xs truncate">{tx.description || catMap[tx.categoryId] || 'General'}</span>
                                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{catMap[tx.categoryId] || ''}</span>
                                   </div>
                                </div>
                                <span className={`font-black tracking-tight ${txColor}`}>
                                  {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                             </div>
                           );
                         })
                     )}
                  </div>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Edit Apartado Modal */}
      <EditApartadoModal
        separado={selectedEditingSeparado}
        isOpen={Boolean(selectedEditingSeparado)}
        onClose={() => setSelectedEditingSeparado(null)}
      />
    </>
  );
};
