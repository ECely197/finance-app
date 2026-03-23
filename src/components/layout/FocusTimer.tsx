import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Target, CheckCircle, ChevronDown, ListTodo } from 'lucide-react';
import { useProjectsData } from '../../hooks/useProjectsData';
import { useAppStore } from '../../store/useAppStore';
import { completeTaskWithRecurrence } from '../../lib/firestore';

const MODES = {
    work: { label: 'Enfoque', time: 25 * 60, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', stroke: '#f43f5e' },
    shortBreak: { label: 'Descanso Corto', time: 5 * 60, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', stroke: '#3b82f6' },
    longBreak: { label: 'Descanso Largo', time: 15 * 60, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', stroke: '#10b981' }
};

export const FocusTimer = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mode, setMode] = useState<keyof typeof MODES>('work');
    const [timeLeft, setTimeLeft] = useState(MODES.work.time);
    const [isActive, setIsActive] = useState(false);
    
    // Task Linking
    const { projects } = useProjectsData();
    const { user, currentProfile, setIsPomodoroRunning } = useAppStore();
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [showTaskSelector, setShowTaskSelector] = useState(false);
    const [showCompletionToast, setShowCompletionToast] = useState(false);

    // Sync global focus state
    useEffect(() => {
        setIsPomodoroRunning(isActive && mode === 'work');
    }, [isActive, mode, setIsPomodoroRunning]);

    // Audio Context
    const playTibetanBell = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime); // High pitch like a small bowl
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 3);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.1); // Fast attack
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4); // Long decay
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 4);
        } catch(e) { console.error('Audio not supported', e) }
    };

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (isActive && timeLeft === 0) {
            setIsActive(false);
            playTibetanBell();
            if (mode === 'work' && selectedTask) {
                setShowCompletionToast(true);
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, selectedTask]);

    const toggleTimer = () => setIsActive(!isActive);
    
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(MODES[mode].time);
    };

    const changeMode = (newMode: keyof typeof MODES) => {
        setIsActive(false);
        setMode(newMode);
        setTimeLeft(MODES[newMode].time);
    };

    const handleCompleteTask = async () => {
        if (!user || !currentProfile || !selectedTask) return;
        try {
            await completeTaskWithRecurrence(user.uid, currentProfile.id, selectedTask.projectId, selectedTask);
            setShowCompletionToast(false);
            setSelectedTask(null);
        } catch(e) { console.error(e) }
    };

    // Derived stats
    const totalTime = MODES[mode].time;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    const currentModeConf = MODES[mode];
    
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate uncompleted tasks for standard selection
    const availableTasks = projects
        .flatMap(p => p.tasks.map(t => ({ ...t, projectId: p.id, projectTitle: p.titulo })))
        .filter(t => !t.isCompleted);

    return (
        <>
            {/* Zen Mode Dimmer overlay removed - now managed by MainLayout */}

            <motion.div 
                className="flex flex-col items-end"
                initial={false}
                animate={isExpanded ? "expanded" : "collapsed"}
            >
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20, scale: 0.9 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 20, scale: 0.9 }} 
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 mb-4 w-72 md:w-80 relative overflow-hidden flex flex-col items-center"
                        >
                            {/* Mode Tabs */}
                            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-full mb-6 w-full relative z-10 border border-slate-100">
                                <button onClick={() => changeMode('work')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-full transition-all ${mode==='work' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Enfoque</button>
                                <button onClick={() => changeMode('shortBreak')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-full transition-all ${mode==='shortBreak' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Corto</button>
                                <button onClick={() => changeMode('longBreak')} className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-full transition-all ${mode==='longBreak' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Largo</button>
                            </div>

                            {/* Circle Timer */}
                            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                                <svg className="w-full h-full -rotate-90 absolute top-0 left-0" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-slate-100" />
                                    <motion.circle 
                                        cx="50" cy="50" r="45" fill="none" strokeWidth="6" strokeLinecap="round"
                                        stroke={currentModeConf.stroke}
                                        initial={{ strokeDasharray: "283 283", strokeDashoffset: 0 }}
                                        animate={{ strokeDashoffset: 283 * (1 - progress / 100) }}
                                        transition={{ duration: 0.5, ease: "linear" }}
                                    />
                                </svg>
                                <div className="z-10 flex flex-col items-center">
                                    <span className={`text-4xl font-black tabular-nums tracking-tighter ${currentModeConf.color}`}>{formatTime(timeLeft)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex justify-center items-center gap-4 mb-6 relative z-10">
                                <button onClick={toggleTimer} className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${isActive ? 'bg-slate-800 shadow-slate-900/20' : currentModeConf.bg.replace('50', '500') + ` shadow-${currentModeConf.color.split('-')[1]}-500/30`}`}>
                                    {isActive ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                                </button>
                                <button onClick={resetTimer} className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                    <RotateCcw size={20} />
                                </button>
                            </div>

                            {/* Task Linker */}
                            {mode === 'work' && (
                                <div className="w-full border-t border-slate-100 pt-4 relative z-20">
                                    {!selectedTask ? (
                                        <button onClick={() => setShowTaskSelector(!showTaskSelector)} className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center gap-2 text-xs font-bold transition-colors">
                                            <ListTodo size={14} /> Vincular a Tarea
                                        </button>
                                    ) : (
                                        <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between group">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <Target size={14} className="text-slate-400 shrink-0" />
                                                <span className="text-xs font-bold text-slate-700 truncate">{selectedTask.titulo}</span>
                                            </div>
                                            <button onClick={() => setSelectedTask(null)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1">
                                                <RotateCcw size={12} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Task Selector Dropdown inside widget */}
                                    <AnimatePresence>
                                        {showTaskSelector && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                                                className="absolute bottom-16 left-0 w-full bg-white shadow-xl border border-slate-100 rounded-2xl p-2 max-h-48 overflow-y-auto custom-scrollbar z-30"
                                            >
                                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 pb-2 pt-1">Tareas Pendientes</div>
                                                {availableTasks.length === 0 ? (
                                                     <div className="px-2 py-3 text-xs text-slate-400 font-semibold text-center bg-slate-50 rounded-lg">No hay tareas pendientes</div>
                                                ) : (
                                                    availableTasks.map(t => (
                                                        <div key={t.id} onClick={() => { setSelectedTask({ ...t, projectId: t.projectId as string, taskId: t.id, titulo: t.titulo }); setShowTaskSelector(false); }} className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl cursor-pointer transition-colors truncate">
                                                            {t.titulo}
                                                        </div>
                                                    ))
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Completion Toast (Only when time hits zero while linked) */}
                            <AnimatePresence>
                                {showCompletionToast && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-0 bg-white/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner mb-4">
                                            <CheckCircle size={32} />
                                        </div>
                                        <h3 className="text-lg font-extrabold text-slate-800 mb-2">¡Misión Cumplida!</h3>
                                        <p className="text-sm text-slate-500 font-medium mb-6">Has finalizado tu sesión enfocada en <b className="text-slate-700">{selectedTask?.titulo}</b>.</p>
                                        
                                        <div className="flex w-full gap-2">
                                            <button onClick={() => setShowCompletionToast(false)} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cerrar</button>
                                            <button onClick={handleCompleteTask} className="flex-[2] py-3 text-xs font-bold uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 rounded-xl transition-all">Completar Tarea</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Button triggers Expansion */}
                <motion.button
                    onClick={() => {
                        if (isActive && mode === 'work') return; // Block closing if active
                        setIsExpanded(!isExpanded);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-md transition-colors relative ${isActive ? 'bg-slate-900 border border-slate-700/50' : 'bg-white border border-slate-100 hover:border-slate-200'} ${(isActive && mode === 'work' && isExpanded) ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    {/* Active Ring Indicator */}
                    {isActive && (
                        <svg className="w-full h-full absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                            <motion.circle 
                                cx="50" cy="50" r="46" fill="none" strokeWidth="4" strokeLinecap="round"
                                stroke={currentModeConf.stroke}
                                initial={{ strokeDasharray: "289 289", strokeDashoffset: 0 }}
                                animate={{ strokeDashoffset: 289 * (1 - progress / 100) }}
                                transition={{ duration: 0.5, ease: "linear" }}
                            />
                        </svg>
                    )}
                    
                    {isExpanded ? (
                        <ChevronDown size={24} className={isActive ? 'text-slate-400' : 'text-slate-500'} />
                    ) : (
                        isActive ? (
                             <div className="flex flex-col items-center">
                                 <span className={`text-[10px] sm:text-xs font-black tabular-nums tracking-tighter ${currentModeConf.color}`}>{formatTime(timeLeft)}</span>
                             </div>
                        ) : (
                             <Target size={24} strokeWidth={2.5} className="text-slate-600" />
                        )
                    )}
                </motion.button>
            </motion.div>
        </>
    );
};
