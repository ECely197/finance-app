import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useObligationsData } from '../../hooks/useObligationsData';
// import { useProjectsData } from '../../hooks/useProjectsData';
// import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { useSeparadosData } from '../../hooks/useSeparadosData';
import { createTransaction, updateSeparado } from '../../lib/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Filter, Target, Package, Plus, DollarSign, X, Tag, Calendar as CalendarIcon, Clock, ChevronDown, Sunset, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

const getRangeDates = (range: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (range) {
    case 'today':
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 6); // 7 items total, incl today
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'custom':
      if (customStart && customEnd) {
         start = new Date(customStart + 'T00:00:00');
         end = new Date(customEnd + 'T23:59:59');
      }
      break;
  }
  return { startStr: start.toISOString(), endStr: end.toISOString() };
};
const MiniCalendar = ({ selectedDate, onSelect, onClose }: { selectedDate: string, onSelect: (date: string) => void, onClose: () => void }) => {
  const [viewDate, setViewDate] = useState(() => selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date());
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const nextMonthDays = Array.from({ length: 42 - (prevMonthDays.length + currentMonthDays.length) }, (_, i) => i + 1);

  const isToday = (d: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (d: number) => {
    if (!selectedDate) return false;
    const sel = new Date(selectedDate + 'T12:00:00');
    return sel.getDate() === d && sel.getMonth() === month && sel.getFullYear() === year;
  };

  const handleDayClick = (day: number, mOffset = 0) => {
    const targetDate = new Date(year, month + mOffset, day, 12);
    onSelect(targetDate.toISOString().slice(0, 10));
  };

  return (
    <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100 w-full max-w-[280px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <h4 className="font-extrabold text-slate-800 text-sm">
          {monthNames[month]} <span className="text-slate-400 font-bold">{year}</span>
        </h4>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysShort.map(d => (
          <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-tighter py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {prevMonthDays.map(d => (
          <button key={`p-${d}`} onClick={() => handleDayClick(d, -1)} className="text-center text-[10px] font-bold text-slate-200 py-1.5 hover:text-slate-400 transition-colors">{d}</button>
        ))}
        {currentMonthDays.map(d => {
          const active = isSelected(d);
          const today = isToday(d);
          return (
            <button 
              key={d} 
              onClick={() => handleDayClick(d)}
              className={`text-center text-[10px] font-bold py-1.5 rounded-xl transition-all relative
                ${active ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}
                ${today && !active ? 'text-blue-500 ring-1 ring-blue-500/30' : ''}
              `}
            >
              {d}
              {today && <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full ${active ? 'bg-white' : 'bg-blue-500'}`} />}
            </button>
          );
        })}
        {nextMonthDays.map(d => (
          <button key={`n-${d}`} onClick={() => handleDayClick(d, 1)} className="text-center text-[10px] font-bold text-slate-200 py-1.5 hover:text-slate-400 transition-colors">{d}</button>
        ))}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
        <button onClick={() => onSelect(new Date().toISOString().slice(0, 10))} className="flex-1 py-2 text-[9px] font-black uppercase text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">Hoy</button>
        <button onClick={onClose} className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">Limpiar</button>
      </div>
    </div>
  );
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
  // const { projects } = useProjectsData();
  // const { recurringExpenses } = useRecurringExpenses();
  const { separados, loading: sepLoading } = useSeparadosData();
  
  const topUrgentObs = processedObligations.filter(ob => !ob.cumplida).slice(0, 3);
  
  // const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  
  // Separados Abono UI State
  const pendingSeparados = separados.filter(s => s.estado === 'pendiente');
  const [abonoModalId, setAbonoModalId] = useState<string | null>(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [isAbonando, setIsAbonando] = useState(false);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, ease: [0.2, 0, 0, 1] as const } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.2, 0, 0, 1] as const } }
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
    
    return { 
       income, 
       fixedExp, 
       varExp, 
       unnecExp, 
       investmentsTotal, 
       balance: income - (fixedExp + varExp + unnecExp + investmentsTotal) 
    };
  }, [transactions]);

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

        // Registrar ingreso del abono
        await createTransaction(user.uid, currentProfile.id, txId, {
           amount,
           type: 'ingreso',
           categoryId: 'abono-separado',
           date: new Date(),
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
    rangeStart.setHours(0,0,0,0);
    rangeEnd.setHours(23,59,59,999);

    const dayMap: Record<string, { income: number, expense: number, dateObj: Date }> = {};
    
    // Safety net against massive date ranges breaking the loop (cap at 365 days)
    const diffTime = Math.abs(rangeEnd.getTime() - rangeStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const safeDays = Math.min(diffDays, 365);
    
    // Fill all days to ensure unbroken timeline
    let curr = new Date(rangeStart);
    for (let i = 0; i < safeDays; i++) {
       const key = curr.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
       // Use a stable snapshot of the date
       dayMap[key] = { income: 0, expense: 0, dateObj: new Date(curr) };
       curr.setDate(curr.getDate() + 1);
    }

    transactions.forEach(tx => {
       const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
       if (txDate >= rangeStart && txDate <= rangeEnd) {
          const key = txDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
    transactions.forEach(tx => {
      if (tx.type === 'ingreso') {
        const d = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
        acc[d.getDay()] += tx.amount;
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
     const y = selectedDayObj.getFullYear();
     const m = selectedDayObj.getMonth();
     const d = selectedDayObj.getDate();
     
     return transactions.filter(tx => {
         const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date.seconds * 1000);
         return txDate.getFullYear() === y && txDate.getMonth() === m && txDate.getDate() === d;
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
      
      {/* HEADER SECTION (Date Range Filters, Actions) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 w-full">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h2>
            <p className="text-slate-500 font-medium">{currentProfile?.name}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start sm:items-center">
            {/* ── Custom Floating Popover Filter ─────────────────── */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>

              {/* Pill Trigger */}
              <motion.button
                onClick={() => setShowDropdown(prev => !prev)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 bg-white border border-slate-100 shadow-sm rounded-full px-4 py-2.5 w-full sm:w-auto cursor-pointer hover:shadow-md transition-shadow h-11"
              >
                <Filter size={15} className="text-blue-400 shrink-0" />
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="font-bold text-slate-700 text-sm whitespace-nowrap">{currentOption.label}</span>
                  {timeRange === 'custom' && customStart && customEnd && (
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {customStart.slice(5)} → {customEnd.slice(5)}
                    </span>
                  )}
                </div>
                <motion.div 
                  className="ml-auto"
                  animate={{ rotate: showDropdown ? 180 : 0 }} 
                  transition={{ duration: 0.18 }}
                >
                  <ChevronDown size={15} className="text-blue-400" />
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
                    className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100/80 z-[200] p-2 overflow-hidden"
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
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-50 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600'
                          }`}>
                            <IconComp size={14} strokeWidth={2.5} />
                          </div>
                          <span className="font-bold text-sm">{opt.label}</span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
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
                          <div className=\"mt-1 pt-3 px-1 border-t border-slate-100\">
                            <div className=\"flex flex-col gap-2 mb-3\">
                              {/* Trigger Buttons for Calendar Selection */}
                              <div className=\"grid grid-cols-2 gap-2\">
                                <button
                                  onClick={() => setActiveDateField(activeDateField === 'start' ? null : 'start')}
                                  className={`flex flex-col items-start px-3 py-2 rounded-2xl border transition-all ${
                                    activeDateField === 'start' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-slate-50'
                                  }`}
                                >
                                  <span className=\"text-[9px] font-black text-slate-400 uppercase tracking-widest\">Desde</span>
                                  <span className=\"text-xs font-bold text-slate-700\">{customStart || '00/00/00'}</span>
                                </button>
                                <button
                                  onClick={() => setActiveDateField(activeDateField === 'end' ? null : 'end')}
                                  className={`flex flex-col items-start px-3 py-2 rounded-2xl border transition-all ${
                                    activeDateField === 'end' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-slate-50'
                                  }`}
                                >
                                  <span className=\"text-[9px] font-black text-slate-400 uppercase tracking-widest\">Hasta</span>
                                  <span className=\"text-xs font-bold text-slate-700\">{customEnd || '00/00/00'}</span>
                                </button>
                              </div>

                              {/* Inline Custom Calendar */}
                              <AnimatePresence>
                                {activeDateField && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className=\"mt-1\"
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
                                className=\"w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm transition-colors mt-1 shadow-lg shadow-blue-500/20\"
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
                       <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                          <Package className="text-emerald-500" strokeWidth={2.5}/>
                          Productos Separados (Pendientes)
                       </h3>
                       <p className="text-sm font-semibold text-slate-400 mt-1">Sigue el progreso de abonos de tus clientes.</p>
                     </div>
                  </div>

                  <div className="flex overflow-x-auto gap-5 pb-4 custom-scrollbar snap-x snap-mandatory">
                     {pendingSeparados.map(sep => {
                        const falta = sep.valorTotal - sep.totalAbonado;
                        const progress = Math.min(100, Math.max(0, (sep.totalAbonado / sep.valorTotal) * 100));

                        return (
                           <div key={sep.id} className="snap-start shrink-0 w-80 bg-white rounded-[2rem] p-5 shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-lg hover:border-emerald-100 transition-all">
                              {/* Background subtle color */}
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

                              <div className="flex items-start gap-4 mb-4 relative z-10">
                                 {sep.fotoUrl ? (
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                                       <img src={sep.fotoUrl} alt={sep.cliente} className="w-full h-full object-cover" />
                                    </div>
                                 ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 text-slate-300">
                                       <Package size={24} strokeWidth={1.5} />
                                    </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-extrabold text-slate-800 text-[15px] truncate">{sep.cliente}</h4>
                                    <p className="text-[12px] font-bold text-slate-400 tracking-wide mt-0.5">TOTAL: {formatCurrency(sep.valorTotal)}</p>
                                 </div>
                              </div>

                              <div className="relative z-10 mb-5">
                                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                    <span className="text-emerald-600 truncate">{formatCurrency(sep.totalAbonado)}</span>
                                    <span className="text-slate-400">Falta {formatCurrency(falta)}</span>
                                 </div>
                                 <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner relative">
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
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-2">
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
                                                className="w-full pl-7 pr-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                placeholder="Monto a abonar"
                                             />
                                          </div>
                                       </div>
                                       <div className="flex gap-2">
                                          <button 
                                             onClick={() => { setAbonoModalId(null); setAbonoMonto(''); }}
                                             className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                          >
                                             Cancelar
                                          </button>
                                          <button 
                                             onClick={() => handleAbonoSubmit(sep)}
                                             disabled={isAbonando || !abonoMonto}
                                             className="flex-1 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                          >
                                             {isAbonando ? '...' : 'Abonar'}
                                          </button>
                                       </div>
                                    </motion.div>
                                 ) : (
                                    <button 
                                       onClick={() => setAbonoModalId(sep.id)}
                                       className="w-full py-3.5 flex items-center justify-center gap-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 font-bold text-sm rounded-xl transition-all border border-slate-100 hover:border-emerald-200"
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
                whileHover={{ y: -4, scale: 1.01, boxShadow: 'var(--shadow-premium-hover)' }} 
                className="bg-white p-6 md:p-8 rounded-[32px] shadow-premium border-none w-full transition-material group"
              >
                <div className="mb-8">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Evolución Diaria</h3>
                  <p className="text-xl font-extrabold text-slate-800">Flujo de Caja Real</p>
                </div>
                <div className="h-[320px] w-full cursor-pointer ml-[-10px] md:ml-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyEvolutionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} onClick={handleBarClick}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={12} minTickGap={30} />
                        <YAxis axisLine={false} tickLine={false} width={50} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                        <RechartsTooltip 
                          cursor={{ stroke: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} 
                          contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', transition: 'all 250ms cubic-bezier(0.2, 0, 0, 1)' }}
                          formatter={(value: any, _name: any) => [formatCurrency(Number(value)), 'Neto']}
                          labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Balance" 
                          stroke="#3b82f6" 
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
              <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[32px] shadow-premium w-full">
                <div className="flex justify-between items-center mb-6 pl-2">
                   <div>
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tus Objetivos</h3>
                     <h2 className="text-xl font-extrabold text-slate-800">Top Performers</h2>
                   </div>
                </div>

                {obsLoading ? (
                   <div className="flex justify-center items-center h-24">
                     <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
                   </div>
                ) : topUrgentObs.length === 0 ? (
                   <div className="border border-dashed border-slate-200 rounded-[24px] p-8 text-center flex flex-col items-center">
                      <p className="text-slate-400 font-bold mb-4">Mesa limpia. No hay metas pendientes.</p>
                      <button onClick={() => navigate('/obligations')} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm">
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
                               className={`flex items-center justify-between p-4 bg-slate-50 rounded-[20px] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md border ${
                                  isUrgent ? 'border-orange-100 hover:border-orange-200' : 'border-transparent hover:border-slate-200'
                               }`}
                            >
                               <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                 <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                    <Target size={20} strokeWidth={2.5}/>
                                 </div>
                                 <div className="flex flex-col">
                                    <h4 className="font-extrabold text-slate-800 text-[15px] line-clamp-1">{ob.titulo}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className={`text-[10px] font-black uppercase tracking-widest ${isUrgent ? 'text-orange-500' : 'text-slate-400'}`}>
                                          {ob.daysRemaining === 0 ? 'Vence hoy' : `Faltan ${ob.daysRemaining}d`}
                                       </span>
                                    </div>
                                 </div>
                               </div>
                               
                               <div className="w-[120px] flex flex-col items-end shrink-0">
                                  <span className={`text-[12px] font-black ${ob.isGoodTrend ? 'text-emerald-500' : 'text-blue-500'} mb-1.5`}>{ob.progress.toFixed(0)}%</span>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden relative">
                                     <motion.div 
                                        className={`h-full absolute left-0 top-0 rounded-full ${ob.isGoodTrend ? 'bg-emerald-500' : 'bg-blue-500'}`}
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
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01, boxShadow: 'var(--shadow-premium-hover)' }} 
                className="bg-white p-8 rounded-[32px] shadow-premium border border-slate-50 sticky top-8 transition-material group"
              >
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tu Dinero</h3>
                       <p className="text-[15px] font-bold text-slate-600">Balance Neto Actual</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-[16px]"><DollarSign size={20} strokeWidth={3}/></div>
                 </div>
                 <span className={`text-4xl font-black tracking-tighter ${metrics.balance < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                    {formatCurrency(metrics.balance)}
                 </span>
                 
                 <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                    <div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ingresos Mes</span>
                       <span className="text-[15px] font-extrabold text-emerald-500">{formatCurrency(metrics.income)}</span>
                    </div>
                    <div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gastos Mes</span>
                       <span className="text-[15px] font-extrabold text-slate-600">-{formatCurrency(metrics.fixedExp + metrics.varExp + metrics.unnecExp)}</span>
                    </div>
                 </div>
              </motion.div>
            </div> {/* End Right Sidebar */}
            {/* Fin 3-Column Layout */}

          <div className="lg:col-span-3 mt-6 w-full">
            {/* Charts Module Baseline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart: Mejores Dias */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01, boxShadow: 'var(--shadow-premium-hover)' }} 
                className="bg-white p-6 md:p-8 pt-8 pb-10 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 lg:col-span-2 transition-material group"
              >
                <div className="mb-10">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest">Análisis de Mejores Días</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">Distribución histórica de Ingresos según el día de la semana</p>
                </div>
                <div className="h-[280px] w-full border-t border-slate-50 pt-6 ml-[-15px] md:ml-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdaysChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={12} />
                        <YAxis axisLine={false} tickLine={false} width={45} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                        <RechartsTooltip 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                          formatter={(value: any) => formatCurrency(Number(value))}
                          labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                        />
                        <Bar 
                          dataKey="Income" 
                          name="Ingresos"
                          fill="#3b82f6" 
                          radius={[6, 6, 6, 6]} 
                          barSize={32}
                          isAnimationActive={true}
                          animationBegin={200}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                           {weekdaysChart.map((entry, index) => {
                              const maxIncome = Math.max(...weekdaysChart.map(d => d.Income));
                              const opacity = entry.Income === maxIncome && entry.Income > 0 ? 1 : 0.6;
                              return <Cell key={`cell-${index}`} fill="#3b82f6" fillOpacity={opacity} />;
                           })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              </motion.div>

              {/* PIE CHART: CATEGORIAS */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -4, scale: 1.01, boxShadow: 'var(--shadow-premium-hover)' }} 
                className="bg-white p-6 md:p-8 pt-8 pb-10 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col justify-center items-center transition-material group"
              >
                <div className="mb-6">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest">Top Categorías</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">Fuentes de mayores ingresos</p>
                </div>
                <div className="flex-1 h-[300px] w-full relative mt-2 border-t border-slate-50">
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
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} 
                          itemStyle={{ fontWeight: 'bold', color: '#334155' }}
                        />
                        <Legend 
                           verticalAlign={isDesktop ? "middle" : "bottom"}
                           layout={isDesktop ? "vertical" : "horizontal"}
                           align={isDesktop ? "right" : "center"}
                           iconType="circle" 
                           wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b', paddingBottom: isDesktop ? '0' : '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Sin ingresos detectados</div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Responsabilidades Próximas */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="flex justify-between items-center mb-6 pl-2">
                 <div>
                   <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Responsabilidades Próximas</h3>
                   <p className="text-sm font-semibold text-slate-400 mt-1">Sigue el progreso de ventas hacia tus metas más urgentes.</p>
                 </div>
              </div>

              {obsLoading ? (
                 <div className="flex justify-center items-center h-24">
                   <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                 </div>
              ) : topUrgentObs.length === 0 ? (
                 <div className="bg-white border border-dashed border-slate-300 rounded-[2rem] p-8 text-center shadow-sm flex flex-col items-center">
                    <p className="text-slate-500 font-bold mb-4">No tienes responsabilidades pendientes o próximas.</p>
                    <button onClick={() => navigate('/obligations')} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm">
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
                             className={`bg-white rounded-[2rem] p-5 cursor-pointer shadow-[0_4px_30px_rgb(0,0,0,0.02)] border transition-all hover:-translate-y-1 hover:shadow-lg group ${
                                isUrgent ? 'border-orange-100' : 'border-slate-100 hover:border-blue-100'
                             }`}
                          >
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                                     <Target size={18} strokeWidth={2.5}/>
                                  </div>
                                  <h4 className="font-extrabold text-slate-700 line-clamp-1">{ob.titulo}</h4>
                               </div>
                               <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isUrgent ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}>
                                  {ob.daysRemaining === 0 ? 'Vence hoy' : `Faltan ${ob.daysRemaining}d`}
                               </div>
                             </div>
                             
                             <div>
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                   <span className="text-slate-400">Progreso</span>
                                   <span className={ob.isGoodTrend ? 'text-emerald-600' : 'text-blue-600'}>{ob.progress.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner relative">
                                   <motion.div 
                                      className={`h-full absolute left-0 top-0 rounded-full ${ob.isGoodTrend ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`}
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
            {currentProfile?.type === 'Business' && (
              <motion.div variants={itemVariants} className="bg-indigo-50/50 p-6 md:p-8 rounded-[2.5rem] border border-indigo-100">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-extrabold text-indigo-900 tracking-tight">Recuperación de Inversión (ROI)</h3>
                    <p className="text-sm font-semibold text-indigo-500/80 mt-1">Sigue el porcentaje de retorno de lo invertido en este periodo.</p>
                  </div>
                </div>
                
                {roiData.length === 0 ? (
                  <div className="bg-white p-6 rounded-[2rem] border border-indigo-50 text-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                      <p className="text-slate-400 text-sm font-bold">No hay inversiones iniciales registradas en este periodo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {roiData.map(inv => (
                        <div key={inv.id} className="bg-white p-5 md:p-6 rounded-3xl border border-indigo-50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-extrabold text-slate-800 line-clamp-1">{inv.description || "Capital Base"}</span>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{inv.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-4 mb-4 overflow-hidden shadow-inner">
                            <motion.div 
                                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-4 rounded-full relative" 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${Math.min(parseInt(inv.percentage), 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                            </motion.div>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-slate-500">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase text-slate-400 tracking-wider">Invertido</span>
                              {formatCurrency(inv.amount)}
                            </div>
                            <div className="flex flex-col gap-1 text-right">
                              <span className="text-[10px] uppercase text-indigo-400 tracking-wider">Retornado</span>
                              <span className="text-indigo-600">{formatCurrency(inv.recovered)}</span>
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

      {/* Daily Transactions Modal */}
      <AnimatePresence>
        {selectedDayObj && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
               onClick={() => setSelectedDayObj(null)} 
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10 max-h-[85vh] flex flex-col"
             >
               <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-start mb-6 sticky top-0 bg-white pt-2 pb-4 z-10 border-b border-slate-100/50">
                     <div>
                       <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Cierre del Día</h3>
                       <p className="text-slate-500 font-bold mt-1 text-sm bg-blue-50 text-blue-600 inline-block px-3 py-1 rounded-full uppercase tracking-widest">
                          {selectedDayObj?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                       </p>
                     </div>
                     <button onClick={() => setSelectedDayObj(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors flex-shrink-0">
                        <X size={20} />
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
    </>
  );
};
