import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Wallet, CreditCard, DollarSign, Activity, Calendar as CalendarIcon, Filter, X, ArrowUpRight, ArrowDownRight, Tag, TrendingDown, Briefcase } from 'lucide-react';

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

export const DashboardView = () => {
  const { currentProfile } = useAppStore();
  
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Drill-down Modal State
  const [selectedDayObj, setSelectedDayObj] = useState<Date | null>(null);

  const { startStr, endStr } = useMemo(() => getRangeDates(timeRange, customStart, customEnd), [timeRange, customStart, customEnd]);
  const { transactions, categories, investments, linkedIncomes, loading } = useDashboardData(startStr, endStr);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
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
    return Object.entries(incomeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
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

  const handleRangeChange = (e: any) => {
    const val = e.target.value;
    setTimeRange(val);
    setShowCustom(val === 'custom');
  };

  return (
    <>
      <div className="space-y-6 w-full max-w-6xl mx-auto pb-20">
        {/* Header and Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard</h2>
            <p className="text-slate-500 font-medium">{currentProfile?.name}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {showCustom && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer shadow-sm" />
                <span className="text-slate-400 font-bold">-</span>
                <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="px-3 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer shadow-sm" />
              </motion.div>
            )}
            <div className="relative inline-block w-full sm:w-auto">
              <select value={timeRange} onChange={handleRangeChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3.5 pl-11 pr-12 rounded-2xl font-extrabold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all cursor-pointer">
                <option value="today">Hoy</option>
                <option value="last_7_days">Últimos 7 días</option>
                <option value="this_month">Este mes</option>
                <option value="last_month">Mes pasado</option>
                <option value="custom">Personalizado...</option>
              </select>
              <Filter size={18} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
              <CalendarIcon size={18} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse">Sincronizando con la nube...</p>
            </div>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Ingresos</p>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><Wallet size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">{formatCurrency(metrics.income)}</p>
              </motion.div>
              
              <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">G. Fijos</p>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><CreditCard size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">-{formatCurrency(metrics.fixedExp)}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">G. Variables</p>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><Activity size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">-{formatCurrency(metrics.varExp)}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">G. Innec.</p>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform"><TrendingDown size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">-{formatCurrency(metrics.unnecExp)}</p>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white p-5 rounded-3xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Inversiones</p>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><Briefcase size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">-{formatCurrency(metrics.investmentsTotal)}</p>
              </motion.div>

              <motion.div variants={itemVariants} className={`p-5 rounded-3xl flex flex-col justify-between shadow-xl border ${
                  metrics.balance < 0 
                  ? 'bg-gradient-to-br from-rose-500 to-rose-700 border-rose-600 shadow-rose-900/20' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-950 border-slate-700 shadow-slate-900/20'
               }`}>
                <div className="flex justify-between items-start mb-3">
                  <p className="text-[11px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">Balance Neto</p>
                  <div className="p-2 bg-white/10 text-white rounded-xl backdrop-blur-md"><DollarSign size={18} strokeWidth={2.5}/></div>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">{formatCurrency(metrics.balance)}</p>
              </motion.div>
            </div>

            {/* Evolución Diaria (ComposedChart 100% width) */}
            <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 w-full mb-6">
              <div className="mb-8">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Evolución Diaria</h3>
                <p className="text-sm font-semibold text-slate-400 mt-1">Comparativa de ingresos y tendencia de balance. (Haz clic en una barra para ver detalles del día).</p>
              </div>
              <div className="h-[320px] w-full cursor-pointer">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyEvolutionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} onClick={handleBarClick}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={12} minTickGap={30} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} tickFormatter={(val) => `$${val >= 1000 ? val/1000 + 'k' : val}`} />
                      <YAxis yAxisId="right" orientation="right" hide />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }} 
                        contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                        formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#64748b', paddingBottom: '20px' }} />
                      <Bar yAxisId="left" dataKey="Ingresos" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      <Line yAxisId="right" type="monotone" dataKey="Balance" name="Margen / Balance Neto" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Charts Module Baseline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart: Mejores Dias */}
              <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 lg:col-span-2">
                <div className="mb-8">
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Análisis de Mejores Días</h3>
                  <p className="text-sm font-semibold text-slate-400 mt-1">Distribución histórica de Ingresos según el día de la semana</p>
                </div>
                <div className="h-[280px] w-full border-t border-slate-50 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdaysChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} dy={12} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} tickFormatter={(val) => `$${val/1000}k`} />
                        <RechartsTooltip 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                          formatter={(value: any) => formatCurrency(Number(value))}
                          labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                        />
                        <Bar dataKey="Income" name="Ingresos" fill="#f59e0b" radius={[12, 12, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Pie Chart: Top Categorías */}
              <motion.div variants={itemVariants} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Top Categorías</h3>
                  <p className="text-sm font-semibold text-slate-400 mt-1">De dónde provienen tus ingresos</p>
                </div>
                <div className="flex-1 min-h-[240px] relative mt-4">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={70} outerRadius={95}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={10}
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: any) => formatCurrency(Number(value))}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} 
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">Sin ingresos detectados</div>
                  )}
                </div>
              </motion.div>
            </div>

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
          </motion.div>
        )}
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
                          {selectedDayObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
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
