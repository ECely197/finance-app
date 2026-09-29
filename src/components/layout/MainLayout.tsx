import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Plus, TrendingUp, Settings, LogOut, 
  ScrollText, Target, X, CheckSquare, Moon, Sun, CalendarClock, PieChart 
} from 'lucide-react';
import { ProfileSelector } from './ProfileSelector';
import { TransactionForm } from '../transactions/TransactionForm';
import { GlobalTaskTicker } from './GlobalTaskTicker';
import { GlobalCommandPalette } from './GlobalCommandPalette';

import { DailyClosingModal } from '../dashboard/DailyClosingModal';
import { TransactionsView } from '../transactions/TransactionsView';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAppStore } from '../../store/useAppStore';
import { Ripple } from '../ui/Ripple';

const ONE_UI_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30
};

export const MainLayout = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  const { isPomodoroRunning, isDarkMode, toggleDarkMode } = useAppStore();

  const navItems = [
    { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Historial', path: '/transactions', icon: ScrollText },
    { name: 'Proyectos', path: '/projects', icon: CheckSquare },
    { name: 'Metas', path: '/obligations', icon: Target },
    { name: 'Inversiones', path: '/investments', icon: TrendingUp },
    { name: 'Gastos Fijos', path: '/recurring', icon: CalendarClock },
    { name: 'Ajustes', path: '/settings', icon: Settings },
  ];

  const mobileNavItems = [
    { name: 'Inicio',       path: '/dashboard',    icon: LayoutDashboard },
    { name: 'Historial',   path: '/transactions',  icon: ScrollText },
    { name: 'Metas',       path: '/obligations',   icon: Target },
    { name: 'Reportes',    path: '/recurring',     icon: PieChart },
    { name: 'Ajustes',     path: '/settings',      icon: Settings },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Escape' && isModalOpen) {
          e.preventDefault();
          setIsModalOpen(false);
          return;
       }

       const target = e.target as HTMLElement;
       if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
       
       if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setIsModalOpen(prev => !prev);
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <GlobalCommandPalette />
      <GlobalTaskTicker />
      <DailyClosingModal isOpen={showClosingModal} onClose={() => setShowClosingModal(false)} />
      
      {/* Root Layout with Ambient Glow Orbs */}
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-[#F2F2F7] flex flex-col md:flex-row overflow-x-hidden selection:bg-[#0381FE]/20 selection:text-[#0381FE] relative">
      
      {/* Ambient Lighting Orbs for Real Glassmorphism Backdrop-Blur Depth */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-600/20 dark:bg-blue-500/15 blur-[110px]" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-indigo-500/15 dark:bg-indigo-600/12 blur-[130px]" />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-teal-500/15 dark:bg-teal-500/10 blur-[120px]" />
      </div>

      {/* Sidebar Desktop - One UI 9.0 Glassmorphic Squircle Aesthetics */}
      <aside className="hidden md:flex flex-col w-72 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-2xl p-6 fixed h-full z-10 border-r border-black/[0.04] dark:border-white/[0.06]">
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[22px] bg-[#0381FE] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#0381FE]/25">
              S
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white block leading-none">SofiLu</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">One UI 9.0</span>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full bg-white/70 dark:bg-zinc-900/55 backdrop-blur-xl text-slate-600 dark:text-zinc-300 hover:text-[#0381FE] shadow-sm border border-black/5 dark:border-white/5 active:scale-95 transition-transform"
            title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro AMOLED'}
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>
        </div>

        <div className="mb-8">
           <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#0381FE] hover:bg-[#026cd5] text-white flex items-center justify-center gap-3 py-3.5 rounded-[24px] font-bold shadow-lg shadow-[#0381FE]/30 transition-all outline-none group relative overflow-hidden active:scale-[0.96]"
           >
              <Ripple />
              <div className="bg-white/20 p-1.5 rounded-full">
                 <Plus size={18} strokeWidth={3}/>
              </div>
              <span>Nueva Transacción</span>
           </motion.button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.name}
                to={item.path!}
                className={({ isActive }) => 
                  `flex items-center gap-3.5 px-4 py-3 rounded-[20px] font-bold transition-all duration-200 outline-none relative overflow-hidden ${
                    isActive 
                    ? 'bg-[#0381FE]/15 dark:bg-[#0381FE]/25 text-[#0381FE] dark:text-[#387AFF] shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-900/40'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Ripple />
                    <item.icon size={20} className={isActive ? 'text-[#0381FE] dark:text-[#387AFF]' : 'opacity-70'} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0381FE] dark:bg-[#387AFF]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-black/[0.04] dark:border-white/[0.05] space-y-1">
          <button 
            onClick={() => setShowClosingModal(true)}
            className="flex items-center gap-3.5 px-4 py-3 text-slate-500 dark:text-zinc-400 hover:text-[#0381FE] dark:hover:text-[#387AFF] hover:bg-white/60 dark:hover:bg-zinc-900/40 rounded-[20px] transition-all w-full font-bold group relative overflow-hidden active:scale-[0.96]"
          >
            <Ripple />
            <Moon size={20} className="opacity-70 group-hover:text-[#0381FE]" strokeWidth={2}/>
            <span>Cierre de Día</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 text-slate-500 dark:text-zinc-400 hover:text-rose-600 hover:bg-white/60 dark:hover:bg-zinc-900/40 rounded-[20px] transition-all w-full font-bold group relative overflow-hidden active:scale-[0.96]"
          >
            <Ripple />
            <LogOut size={20} className="opacity-70 group-hover:text-rose-500" strokeWidth={2}/>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 mb-28 md:mb-0 w-full min-h-screen flex flex-col relative z-1">
        {/* Top Header - Samsung Frosted Glass Sticky Bar */}
        <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#F2F2F7]/75 dark:bg-black/75 px-4 md:px-10 py-3.5 flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04]">
          <div className="md:hidden flex items-center gap-2.5">
             <div className="w-10 h-10 rounded-[20px] bg-[#0381FE] text-white flex items-center justify-center font-black shadow-md shadow-[#0381FE]/25 text-lg shrink-0">S</div>
             <div className="min-w-0">
               <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base block leading-none truncate">SofiLu</span>
               <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mt-0.5 truncate">One UI 9.0</span>
             </div>
          </div>

          {/* Quick Capture Hint (Desktop) */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-white/70 dark:bg-zinc-900/55 backdrop-blur-xl rounded-full border border-black/5 dark:border-white/5 text-slate-400 dark:text-zinc-500 cursor-text hover:bg-white/90 dark:hover:bg-zinc-800 transition-colors ml-4 shadow-sm" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
             <span className="text-xs font-semibold mr-2">Búsqueda rápida...</span>
             <span className="text-[10px] font-bold bg-[#F2F2F7] dark:bg-zinc-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-zinc-400">Cmd K</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors md:hidden active:scale-90"
              title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro AMOLED'}
            >
               {isDarkMode ? <Sun size={19} className="text-amber-400" /> : <Moon size={19} />}
            </button>
            <button onClick={() => setShowClosingModal(true)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-full transition-colors md:hidden active:scale-90" title="Cierre de Día">
               <CalendarClock size={19} />
            </button>
            <ProfileSelector />
          </div>
        </header>

        {/* Page Content with Slide Transition */}
        <div className="flex-1 p-3.5 sm:p-6 md:p-10 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
               <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/*
        ════════════════════════════════════════════════════════
          ONE UI 9.0 FLOATING PILL DOCK & CLEAN PRIMARY + FAB
          (Optimized for Pop-up View: 260px - 380px)
        ════════════════════════════════════════════════════════
      */}
      <div className="md:hidden fixed bottom-4 left-3 right-3 max-[380px]:left-2 max-[380px]:right-2 z-50 flex items-center gap-2 pointer-events-none">
        {/* Floating Capsule Dock with Real Glassmorphism */}
        <nav className="flex-1 h-14 max-[380px]:h-13 rounded-full backdrop-blur-2xl bg-white/75 dark:bg-zinc-900/65 shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/40 dark:border-white/[0.08] px-2 max-[380px]:px-1 py-1 flex items-center justify-around pointer-events-auto">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path!}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center transition-all duration-150 outline-none select-none active:scale-[0.92] ${
                  isActive
                    ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] rounded-full px-3 max-[380px]:px-2 py-1 font-bold'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 px-2 max-[380px]:px-1 py-1 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] max-[380px]:hidden tracking-tight mt-0.5">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Clean Samsung Vibrant Blue + FAB (Only FAB, perfectly aligned) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsModalOpen(true)}
          className="w-13 h-13 max-[380px]:w-11 max-[380px]:h-11 rounded-[22px] max-[380px]:rounded-[18px] bg-[#0381FE] text-white flex items-center justify-center shadow-lg shadow-[#0381FE]/35 shrink-0 pointer-events-auto active:scale-95 transition-transform outline-none"
          title="Nueva Transacción"
        >
          <Ripple />
          <Plus size={24} strokeWidth={3} className="max-[380px]:w-5 max-[380px]:h-5" />
        </motion.button>
      </div>

      {/* FocusLock Overlay */}
      <AnimatePresence>
          {isPomodoroRunning && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-[998] bg-black/90 backdrop-blur-md pointer-events-auto"
              />
          )}
      </AnimatePresence>

      {/* Global Modals: Full-screen or Bottom Sheet */}
      <AnimatePresence>
          {showTransactionsModal && (
             <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 lg:p-10">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setShowTransactionsModal(false)} 
                  className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                />
                <motion.div 
                  initial={{ y: '100%', opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  exit={{ y: '100%', opacity: 0 }} 
                  transition={ONE_UI_SPRING}
                  className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl relative w-full h-[90vh] sm:rounded-[32px] rounded-t-[32px] shadow-2xl z-10 overflow-hidden flex flex-col border border-white/40 dark:border-white/5"
                >
                   {/* One UI Drag Handle */}
                   <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />

                   <div className="flex justify-between items-center px-6 py-4 bg-transparent border-b border-black/[0.04] dark:border-white/[0.05] shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-[#0381FE]/15 text-[#0381FE] rounded-[18px] flex items-center justify-center"><ScrollText size={20} /></div>
                         <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Historial Completo</h2>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Movimientos y Pasarelas</p>
                         </div>
                      </div>
                      <button onClick={() => setShowTransactionsModal(false)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 rounded-full transition-colors outline-none active:scale-90"><X size={18} /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
                      <TransactionsView hideHeader={true} />
                   </div>
                </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Global Transaction Modal (Samsung One UI Bottom Sheet) */}
      <AnimatePresence>
         {isModalOpen && !isPomodoroRunning && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                 onClick={() => setIsModalOpen(false)} 
                 className="absolute inset-0 bg-black/60 backdrop-blur-md" 
               />
               
               <motion.div 
                 initial={{ y: '100%', opacity: 0 }} 
                 animate={{ y: 0, opacity: 1 }} 
                 exit={{ y: '100%', opacity: 0 }} 
                 transition={ONE_UI_SPRING}
                 className="relative w-full max-w-2xl bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl sm:rounded-[32px] rounded-t-[32px] shadow-2xl z-10 max-h-[92vh] flex flex-col border border-white/40 dark:border-white/5"
               >
                 {/* Drag indicator for Samsung Bottom Sheet */}
                 <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" onClick={() => setIsModalOpen(false)} />

                 {/* Modal Header Minimalist */}
                 <div className="px-6 pb-4 flex justify-between items-center bg-transparent border-b border-black/[0.04] dark:border-white/[0.05]">
                    <div>
                       <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registro de Movimiento</h2>
                       <p className="text-[11px] font-bold text-[#0381FE] dark:text-[#387AFF] uppercase tracking-widest mt-0.5">SofiLu Intelligent Vault</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 rounded-full transition-all shadow-sm outline-none active:scale-90">
                       <X size={18} />
                    </button>
                 </div>
                 
                 {/* Modal flow content */}
                 <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                    <TransactionForm 
                       onComplete={() => setIsModalOpen(false)} 
                    />
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
      
    </div>
    </>
  );
};
