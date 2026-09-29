import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, KanbanSquare as KanbanIcon, BookText, CalendarDays, Zap, ZapOff } from 'lucide-react';
import { ProjectsView } from '../projects/ProjectsView';
import { KanbanView } from './KanbanView';
import { NotesView } from './NotesView';
import { CalendarView } from './CalendarView';
import { FocusTimer } from '../layout/FocusTimer';

export const ProductivityWorkspace = () => {
    const { workspaceActiveTab, setWorkspaceActiveTab, isFocusModeActive, setIsFocusModeActive, isPomodoroRunning } = useAppStore();

    const handleExitFocusMode = () => {
        if (isPomodoroRunning && !window.confirm("¿Seguro que quieres salir? Tu sesión de Focus está corriendo.")) {
            return;
        }
        setIsFocusModeActive(false);
    };

    const tabs = [
        { id: 'list',     label: 'Listas',    icon: CheckSquare },
        { id: 'kanban',   label: 'Kanban',    icon: KanbanIcon  },
        { id: 'notes',    label: 'Notas',     icon: BookText    },
        { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    ] as const;

    return (
        <div className={`min-h-screen text-slate-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-500 ${isFocusModeActive ? 'bg-black border-none' : 'bg-[#F2F2F7] dark:bg-black'}`}>
            
            {/* Modo Enfoque Header */}
            {isFocusModeActive && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="sticky top-0 z-[100] bg-black/90 backdrop-blur-2xl w-full flex items-center justify-between p-4 md:px-8 border-b border-white/10 shadow-2xl"
                >
                    <div className="flex items-center gap-6">
                        <FocusTimer isDark={true} />
                        <div className="hidden md:block">
                            <span className="text-slate-400 font-semibold tracking-widest uppercase text-xs">Modo Enfoque</span>
                            <p className="text-slate-200 font-bold text-sm">Fluyendo al máximo...</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExitFocusMode}
                        className="flex items-center gap-2 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white px-4 py-2 rounded-full transition-all font-bold text-sm active:scale-95"
                    >
                        <ZapOff size={16} /> Salir del Enfoque
                    </button>
                </motion.div>
            )}

            {/* Header Normal */}
            {!isFocusModeActive && (
                <header className="bg-transparent px-6 pt-6 sm:pt-10 pb-2 shrink-0">
                    {/* Title row */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Segundo Cerebro</h1>
                            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Tu espacio focalizado libre de distracciones.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <FocusTimer isDark={false} />
                            <button 
                                onClick={() => setIsFocusModeActive(true)}
                                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 text-white hover:brightness-110 px-5 py-2.5 rounded-full transition-all font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95"
                            >
                                <Zap size={14} strokeWidth={2.5}/> Modo Enfoque
                            </button>
                        </div>
                    </div>

                    {/* ── Segmented Control Tab Bar (One UI 9.0 Capsule) ── */}
                    <div className="flex w-full bg-slate-200/70 dark:bg-[#1C1C1E] rounded-full p-1.5 gap-1.5 shadow-inner">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setWorkspaceActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-bold text-xs transition-all duration-200 relative overflow-hidden active:scale-[0.96] ${
                                    workspaceActiveTab === tab.id
                                        ? 'bg-white dark:bg-[#252528] text-[#0381FE] dark:text-[#387AFF] shadow-sm font-extrabold'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                <tab.icon size={15} strokeWidth={workspaceActiveTab === tab.id ? 2.5 : 2} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mobile focus mode button (below tabs on mobile) */}
                    <div className="mt-3 md:hidden">
                        <button 
                            onClick={() => setIsFocusModeActive(true)}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 text-white px-4 py-2.5 rounded-full transition-all font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            <Zap size={14} strokeWidth={2.5}/> Modo Enfoque
                        </button>
                    </div>
                </header>
            )}

            {/* Main Content (mb-28 so the One UI floating dock doesn't overlap) */}
            <main className={`flex-1 overflow-hidden flex flex-col relative w-full h-full mb-28 sm:mb-24 ${isFocusModeActive ? 'bg-black' : 'bg-[#F2F2F7] dark:bg-black'}`}>
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={workspaceActiveTab}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.18 }}
                        className="max-w-7xl mx-auto h-full w-full"
                    >
                        {workspaceActiveTab === 'list' && (
                            <div className="overflow-y-auto px-6 py-6 md:px-10 h-full custom-scrollbar">
                                <ProjectsView hideHeader={true} />
                            </div>
                        )}
                        {workspaceActiveTab === 'kanban' && (
                            <div className="h-full w-full">
                                <KanbanView />
                            </div>
                        )}
                        {workspaceActiveTab === 'notes' && (
                            <div className="h-full w-full">
                                <NotesView />
                            </div>
                        )}
                        {workspaceActiveTab === 'calendar' && (
                            <div className="h-full w-full">
                                <CalendarView />
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};
