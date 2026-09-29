import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsData } from '../../hooks/useProjectsData';
import { useNotesData } from '../../hooks/useNotesData';
import { useAppStore } from '../../store/useAppStore';
import { createTask } from '../../lib/firestore';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Plus, X, MessageSquare } from 'lucide-react';
import { formatToColombiaDate, parseSafeDate } from '../../utils/dateUtils';

export const CalendarView = () => {
    const { user, currentProfile } = useAppStore();
    const { projects } = useProjectsData();
    const { notes } = useNotesData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month'|'week'|'day'>('month');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [showDayDetail, setShowDayDetail] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedHour, setSelectedHour] = useState('12:00');
    const [projectId, setProjectId] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    // Ajusar para que la semana empiece el Lunes (1), en lugar de Domingo (0)
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // Helper para solucionar desfase horario (UTC-5 Colombia fix)
    const getLocalDateStr = (d: Date) => {
        return formatToColombiaDate(d);
    };

    const previousPeriod = () => {
        if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        if (view === 'week') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
        if (view === 'day') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
    };
    
    const nextPeriod = () => {
        if (view === 'month') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        if (view === 'week') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
        if (view === 'day') setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
    };

    const today = () => setCurrentDate(new Date());

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Map projects and tasks to a specific Date string (YYYY-MM-DD)
    const itemsByDate: Record<string, { type: 'project' | 'task'; title: string; isCompleted: boolean; id: string }[]> = {};

    projects.forEach(p => {
        if (p.fechaLimite) {
            const dateObj = p.fechaLimite.toDate ? p.fechaLimite.toDate() : new Date(p.fechaLimite);
            const dateStr = getLocalDateStr(dateObj);
            if (!itemsByDate[dateStr]) itemsByDate[dateStr] = [];
            itemsByDate[dateStr].push({ type: 'project', title: p.titulo, isCompleted: p.estado === 'done', id: p.id || '' });
        }
        
        p.tasks?.forEach(t => {
            if (t.dueDate) {
                const dateObj = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
                const dateStr = getLocalDateStr(dateObj);
                if (!itemsByDate[dateStr]) itemsByDate[dateStr] = [];
                itemsByDate[dateStr].push({ type: 'task', title: t.titulo, isCompleted: t.isCompleted, id: t.id });
            }
        });
    });

    const handleDayClick = (dateStr: string) => {
        setSelectedDate(dateStr);
        setShowDayDetail(true);
    };

    const handleCreateTaskClick = (dateStr: string, hourStr = '12:00') => {
        setSelectedDate(dateStr);
        setSelectedHour(hourStr);
        setProjectId('');
        setTaskTitle('');
        setShowModal(true);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentProfile || !projectId || !taskTitle.trim() || !selectedDate) return;
        setIsSubmitting(true);
        try {
            await createTask(user.uid, currentProfile.id, projectId, {
                titulo: taskTitle.trim(),
                isCompleted: false,
                createdAt: new Date(),
                dueDate: new Date(`${selectedDate}T${selectedHour}:00`)
            });
            setShowModal(false);
        } catch (error) {
            console.error("Error creating task from calendar:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCalendarDays = () => {
        const gridDays = [];
        const todayStr = getLocalDateStr(new Date());

        // Empty cells for days before the 1st
        for (let i = 0; i < adjustedFirstDay; i++) {
            gridDays.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/40 dark:bg-white/[0.02] border-r border-b border-black/5 dark:border-white/5 pointer-events-none"></div>);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = getLocalDateStr(cellDate);
            const isToday = dateStr === todayStr;
            const dayItems = itemsByDate[dateStr] || [];

            gridDays.push(
                <div 
                    key={day} 
                    onClick={() => handleDayClick(dateStr)}
                    className={`min-h-[100px] md:min-h-[120px] p-2 flex flex-col border-r border-b border-black/5 dark:border-white/5 transition-colors cursor-pointer hover:bg-[#0381FE]/5 dark:hover:bg-[#0381FE]/10 ${
                        isToday ? 'bg-[#0381FE]/10 dark:bg-[#0381FE]/15' : 'bg-white dark:bg-[#17171A]'
                    }`}
                >
                    <span className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[#0381FE] text-white font-extrabold shadow-sm' : 'text-slate-600 dark:text-zinc-400'
                    }`}>
                        {day}
                    </span>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 max-h-[80px]">
                        {dayItems.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex items-start gap-1">
                                {item.isCompleted ? (
                                    <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                                ) : (
                                    <Circle size={10} className="text-slate-300 dark:text-zinc-600 mt-0.5 shrink-0" />
                                )}
                                <span className={`text-[9px] leading-tight font-semibold truncate ${
                                    item.isCompleted ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-700 dark:text-zinc-200'
                                }`}>
                                    {item.type === 'project' ? <strong>[P]</strong> : ''} {item.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return gridDays;
    };

    const renderHourlyGrid = (isWeek: boolean) => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const daysToRender = isWeek ? 7 : 1;
        const startDay = isWeek ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay() + 1) : currentDate;
        
        return (
            <div className="flex-1 flex overflow-y-auto bg-white dark:bg-[#17171A] custom-scrollbar w-full">
                {/* Time Axis */}
                <div className="w-16 shrink-0 flex flex-col border-r border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#1C1C1E] relative z-10">
                    {hours.map(hour => (
                        <div key={`hx-${hour}`} className="h-16 border-b border-black/5 dark:border-white/5 flex items-start justify-center pt-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">{String(hour).padStart(2, '0')}:00</span>
                        </div>
                    ))}
                </div>
                
                {/* Day Columns */}
                <div className="flex-1 flex relative">
                    {Array.from({ length: daysToRender }).map((_, dIdx) => {
                        const colDate = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + dIdx);
                        const dateStr = getLocalDateStr(colDate);
                        const dayItems = itemsByDate[dateStr] || [];

                        return (
                            <div key={`col-${dIdx}`} className="flex-1 border-r border-black/5 dark:border-white/5 min-w-[120px] relative">
                                {hours.map(hour => (
                                    <div 
                                        key={`cell-${dateStr}-${hour}`} 
                                        onClick={() => handleCreateTaskClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                                        className="h-16 border-b border-black/5 dark:border-white/5 hover:bg-[#0381FE]/5 cursor-pointer transition-colors"
                                    />
                                ))}

                                {dayItems.map((item, idx) => {
                                    const hourOffset = 12 + (idx * 0.5); 
                                    const topPos = (hourOffset * 64) + 'px';
                                    return (
                                        <div 
                                            key={`item-${item.id}-${idx}`}
                                            className="absolute left-1 right-1 bg-[#0381FE]/15 border border-[#0381FE]/30 rounded-2xl p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10"
                                            style={{ top: topPos, height: '3.5rem' }}
                                        >
                                            <span className="text-[10px] font-bold text-[#0381FE] dark:text-[#387AFF] line-clamp-2">
                                                {item.title}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#17171A] rounded-[28px] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden p-6 max-h-full">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white capitalize tracking-tight flex items-center gap-2">
                        {view === 'month' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : 
                         view === 'week' ? `Semana del ${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}` : 
                         `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}`}
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 dark:bg-[#1C1C1E] p-1 rounded-full">
                        <button 
                            onClick={() => setView('month')} 
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                view === 'month' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
                            }`}
                        >
                            Mes
                        </button>
                        <button 
                            onClick={() => setView('week')} 
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                view === 'week' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
                            }`}
                        >
                            Semana
                        </button>
                        <button 
                            onClick={() => setView('day')} 
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                view === 'day' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700'
                            }`}
                        >
                            Día
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1C1C1E] p-1 rounded-full border border-black/5 dark:border-white/5">
                        <button onClick={previousPeriod} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-zinc-400 transition-all"><ChevronLeft size={16} strokeWidth={3}/></button>
                        <button onClick={today} className="px-3 py-1 font-bold text-xs text-slate-700 dark:text-zinc-300 hover:text-black transition-colors">Hoy</button>
                        <button onClick={nextPeriod} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-zinc-400 transition-all"><ChevronRight size={16} strokeWidth={3}/></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                
                {view === 'month' ? (
                    <>
                        <div className="grid grid-cols-7 bg-slate-50 dark:bg-[#1C1C1E] border-b border-black/5 dark:border-white/5">
                            {weekDays.map(d => (
                                <div key={d} className="p-3 text-center text-xs font-black tracking-widest uppercase text-slate-400 dark:text-zinc-500 border-r border-black/5 dark:border-white/5 last:border-r-0">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-black/20">
                            {renderCalendarDays()}
                        </div>
                    </>
                ) : (
                    <>
                        {view === 'week' && (
                            <div className="flex border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#1C1C1E]">
                                <div className="w-16 shrink-0 border-r border-black/5 dark:border-white/5" />
                                <div className="flex-1 flex">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={`wh-${i}`} className="flex-1 p-3 text-center text-xs font-black tracking-widest text-slate-400 dark:text-zinc-500 border-r border-black/5 dark:border-white/5 last:border-r-0">
                                            {weekDays[i]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {renderHourlyGrid(view === 'week')}
                    </>
                )}

            </div>

            {/* Modal - One UI 9.0 Bottom Sheet */}
            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div 
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 sm:p-8 border border-white/20 dark:border-white/5"
                        >
                            {/* Drag handle */}
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />

                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Tarea para el {parseSafeDate(selectedDate).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</h2>
                                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">Se vinculará a un Proyecto existente</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">HORA</label>
                                        <input 
                                            type="time"
                                            value={selectedHour}
                                            onChange={e => setSelectedHour(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-slate-800 dark:text-white text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-[#0381FE]/40 transition-all font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">PROYECTO DESTINO</label>
                                        <select 
                                            value={projectId}
                                            onChange={e => setProjectId(e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-slate-800 dark:text-white text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-[#0381FE]/40 transition-all cursor-pointer"
                                            required
                                        >
                                            <option value="" disabled className="bg-white dark:bg-[#17171A]">Selecciona un Proyecto...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id} className="bg-white dark:bg-[#17171A]">{p.titulo}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">QUÉ DEBES HACER</label>
                                    <input 
                                        type="text"
                                        value={taskTitle}
                                        onChange={e => setTaskTitle(e.target.value)}
                                        placeholder="Ej: Llamar proveedor, Redactar email..."
                                        className="w-full bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 text-slate-800 dark:text-white text-sm font-bold rounded-2xl px-4 py-3.5 outline-none focus:ring-2 ring-[#0381FE]/40 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="mt-4 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || !projectId || !taskTitle.trim()}
                                        className="px-6 py-3 text-sm font-bold text-white bg-[#0381FE] hover:bg-[#0270df] rounded-2xl shadow-md shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        {isSubmitting ? <Circle className="animate-spin" size={16} /> : <Plus size={16} strokeWidth={3} />}
                                        Agendar Tarea
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Panel Lateral Transitorio para Detalles del Día */}
            <AnimatePresence>
                {showDayDetail && (
                    <motion.div 
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-[#17171A] border-l border-black/5 dark:border-white/5 shadow-2xl z-50 flex flex-col"
                    >
                        <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Agenda</h3>
                                <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">{selectedDate && parseSafeDate(selectedDate).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p>
                            </div>
                            <button onClick={() => setShowDayDetail(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {itemsByDate[selectedDate]?.map((item, idx) => {
                                const linkedNote = item.type === 'project' ? notes.find(n => n.linkedProjectId === item.id) : null;
                                return (
                                <div key={idx} className="bg-slate-50 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl p-3.5 flex flex-col gap-2 relative group hover:border-[#0381FE]/40 transition-colors cursor-pointer">
                                    <div className="flex items-start gap-2" onClick={() => handleCreateTaskClick(selectedDate)}>
                                        {item.isCompleted ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <Circle size={16} className="text-slate-300 dark:text-zinc-600 mt-0.5 shrink-0" />}
                                        <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight flex-1">{item.title}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-200 dark:bg-white/10 uppercase tracking-widest px-2 py-0.5 rounded-full">{item.type}</span>
                                        {linkedNote && (
                                            <div className="group/note relative">
                                                <button className="text-slate-400 hover:text-[#0381FE] transition-colors">
                                                    <MessageSquare size={14} />
                                                </button>
                                                {/* Mini Note Preview Tooltip */}
                                                <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-slate-900 text-white text-xs rounded-2xl shadow-xl opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-50 overflow-hidden pointer-events-none">
                                                    <p className="font-bold mb-1 truncate">{linkedNote.titulo}</p>
                                                    <div className="line-clamp-3 text-slate-300 zoom-50" dangerouslySetInnerHTML={{ __html: linkedNote.contenidoHtml }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )
                            })}
                            {(!itemsByDate[selectedDate] || itemsByDate[selectedDate].length === 0) && (
                                <p className="text-sm font-semibold text-slate-400 dark:text-zinc-500 text-center mt-10">Día libre de tareas.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-black/5 dark:border-white/5">
                            <button 
                                onClick={() => { setShowDayDetail(false); handleCreateTaskClick(selectedDate); }}
                                className="w-full py-3.5 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/25 active:scale-95"
                            >
                                <Plus size={18} strokeWidth={3} /> Añadir a este día
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
