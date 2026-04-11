import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsData } from '../../hooks/useProjectsData';
import { useNotesData } from '../../hooks/useNotesData';
import { useAppStore } from '../../store/useAppStore';
import { createTask } from '../../lib/firestore';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Plus, X, MessageSquare } from 'lucide-react';

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
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localTime = new Date(d.getTime() - tzOffset);
        return localTime.toISOString().split('T')[0];
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
            gridDays.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/30 border-r border-b border-slate-100 rounded-tl-sm pointer-events-none"></div>);
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
                    className={`min-h-[100px] md:min-h-[120px] p-2 flex flex-col border-r border-b border-slate-100 transition-colors cursor-pointer hover:bg-blue-50/30 ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}
                >
                    <span className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                        {day}
                    </span>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 max-h-[80px]">
                        {dayItems.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex items-start gap-1">
                                {item.isCompleted ? (
                                    <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                                ) : (
                                    <Circle size={10} className="text-slate-300 mt-0.5 shrink-0" />
                                )}
                                <span className={`text-[9px] leading-tight font-semibold truncate ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
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
            <div className="flex-1 flex overflow-y-auto bg-white custom-scrollbar w-full">
                {/* Time Axis */}
                <div className="w-16 shrink-0 flex flex-col border-r border-slate-100 bg-slate-50 relative z-10">
                    {hours.map(hour => (
                        <div key={`hx-${hour}`} className="h-16 border-b border-slate-100 flex items-start justify-center pt-2">
                            <span className="text-[10px] font-bold text-slate-400">{String(hour).padStart(2, '0')}:00</span>
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
                            <div key={`col-${dIdx}`} className="flex-1 border-r border-slate-100 min-w-[120px] relative">
                                {hours.map(hour => (
                                    <div 
                                        key={`cell-${dateStr}-${hour}`} 
                                        onClick={() => handleCreateTaskClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                                        className="h-16 border-b border-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                    />
                                ))}

                                {/* Overlay Items (Rough placement based on hour) */}
                                {dayItems.map((item, idx) => {
                                    // Hacky way to extract hour if not stored explicitly, default to 12.
                                    const hourOffset = 12 + (idx * 0.5); 
                                    const topPos = (hourOffset * 64) + 'px'; // 64px = h-16
                                    return (
                                        <div 
                                            key={`item-${item.id}-${idx}`}
                                            className="absolute left-1 right-1 bg-blue-100 border border-blue-200 rounded-lg p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10"
                                            style={{ top: topPos, height: '3.5rem' }}
                                        >
                                            <span className="text-[10px] font-bold text-blue-800 line-clamp-2">
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
        <div className="h-full flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 max-h-full">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight flex items-center gap-2">
                        {view === 'month' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : 
                         view === 'week' ? `Semana del ${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}` : 
                         `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}`}
                    </h2>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Mes</button>
                        <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
                        <button onClick={() => setView('day')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'day' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Día</button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <button onClick={previousPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all"><ChevronLeft size={18} strokeWidth={3}/></button>
                        <button onClick={today} className="px-3 py-1 font-bold text-xs text-slate-600 hover:text-slate-800 transition-colors">Hoy</button>
                        <button onClick={nextPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all"><ChevronRight size={18} strokeWidth={3}/></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                
                {view === 'month' ? (
                    <>
                        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                            {weekDays.map(d => (
                                <div key={d} className="p-3 text-center text-xs font-black tracking-widest uppercase text-slate-400 border-r border-slate-100 last:border-r-0">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-slate-50">
                            {renderCalendarDays()}
                        </div>
                    </>
                ) : (
                    <>
                        {view === 'week' && (
                            <div className="flex border-b border-slate-100 bg-slate-50">
                                <div className="w-16 shrink-0 border-r border-slate-100" />
                                <div className="flex-1 flex">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={`wh-${i}`} className="flex-1 p-3 text-center text-xs font-black tracking-widest text-slate-400 border-r border-slate-100 last:border-r-0">
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

            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">Tarea para el {new Date(selectedDate + 'T12:00:00').toLocaleDateString()}</h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">Se vinculará a un Proyecto existente</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">HORA</label>
                                        <input 
                                            type="time"
                                            value={selectedHour}
                                            onChange={e => setSelectedHour(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">PROYECTO DESTINO</label>
                                        <select 
                                            value={projectId}
                                            onChange={e => setProjectId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500/20 transition-all cursor-pointer"
                                            required
                                        >
                                            <option value="" disabled>Selecciona un Proyecto...</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.titulo}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">QUÉ DEBES HACER</label>
                                    <input 
                                        type="text"
                                        value={taskTitle}
                                        onChange={e => setTaskTitle(e.target.value)}
                                        placeholder="Ej: Llamar proveedor, Redactar email..."
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500/20 transition-all"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="mt-4 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || !projectId || !taskTitle.trim()}
                                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
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
                        className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Agenda</h3>
                                <p className="text-sm font-semibold text-slate-500">{selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setShowDayDetail(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {itemsByDate[selectedDate]?.map((item, idx) => {
                                const linkedNote = item.type === 'project' ? notes.find(n => n.linkedProjectId === item.id) : null;
                                return (
                                <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 relative group hover:border-blue-200 transition-colors cursor-pointer">
                                    <div className="flex items-start gap-2" onClick={() => handleCreateTaskClick(selectedDate)}>
                                        {item.isCompleted ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <Circle size={16} className="text-slate-300 mt-0.5 shrink-0" />}
                                        <p className="text-sm font-bold text-slate-800 leading-tight flex-1">{item.title}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 uppercase tracking-widest px-2 py-0.5 rounded-md">{item.type}</span>
                                        {linkedNote && (
                                            <div className="group/note relative">
                                                <button className="text-slate-400 hover:text-blue-500 transition-colors">
                                                    <MessageSquare size={14} />
                                                </button>
                                                {/* Mini Note Preview Tooltip */}
                                                <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-50 overflow-hidden pointer-events-none">
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
                                <p className="text-sm font-semibold text-slate-400 text-center mt-10">Día libre de tareas.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100">
                            <button 
                                onClick={() => { setShowDayDetail(false); handleCreateTaskClick(selectedDate); }}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
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
