import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, Home, TrendingUp, Settings, LogOut, ScrollText, Target, X, CheckSquare, Moon, CalendarClock, Brain, PieChart } from 'lucide-react';
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

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  const { isPomodoroRunning } = useAppStore();

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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800 overflow-x-hidden pt-1">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#F8FAFC] p-8 fixed h-full z-10">
        <div className="mb-12 flex items-center gap-4">
          <div className="w-12 h-12 rounded-[24px] bg-blue-500 text-white flex items-center justify-center font-black text-2xl shadow-premium">
            S
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800">SofiLu.</span>
        </div>
        <div className="mb-10">
           <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-white border border-slate-100 hover:border-blue-500 text-slate-800 flex items-center justify-center gap-3 py-4 rounded-[24px] font-bold shadow-premium transition-all outline-none group relative overflow-hidden"
           >
              <Ripple />
              <div className="bg-blue-50 text-blue-500 p-1.5 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors">
                 <Plus size={18} strokeWidth={3}/>
              </div>
              Nueva Transacción
           </motion.button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.name}
                to={item.path!}
                className={({ isActive }) => 
                  `flex items-center gap-4 px-5 py-4 rounded-[24px] font-bold transition-all duration-300 outline-none relative overflow-hidden ${
                    isActive 
                    ? 'bg-white shadow-premium text-blue-600' 
                    : 'text-slate-400 hover:text-slate-800 hover:bg-white/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Ripple />
                    <item.icon size={22} className={isActive ? 'text-blue-500' : 'opacity-70'} strokeWidth={isActive ? 2.5 : 2} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100/50">
          <button 
            onClick={() => setShowClosingModal(true)}
            className="flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-[24px] transition-all w-full font-bold mb-2 group relative overflow-hidden"
          >
            <Ripple />
            <Moon size={22} className="opacity-70 group-hover:text-indigo-500" strokeWidth={2}/>
            Cierre de Día
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-rose-600 hover:bg-white rounded-[24px] transition-all w-full font-bold group relative overflow-hidden"
          >
            <Ripple />
            <LogOut size={22} className="opacity-70 group-hover:text-rose-500" strokeWidth={2}/>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 mb-24 md:mb-0 w-full min-h-screen flex flex-col bg-[#F8FAFC]">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#F8FAFC]/80 backdrop-blur-xl px-6 md:px-10 py-6 flex items-center justify-between">
          <div className="md:hidden flex items-center gap-3">
             <div className="w-10 h-10 rounded-[20px] bg-blue-500 text-white flex items-center justify-center font-black shadow-premium">S</div>
             <span className="font-black tracking-tight text-slate-800 text-xl">SofiLu.</span>
          </div>

          {/* Quick Capture Hint */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-lg border border-slate-200 text-slate-400 cursor-text hover:bg-slate-100 transition-colors ml-4 shadow-inner" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
             <span className="text-xs font-semibold mr-2">Captura Rápida...</span>
             <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded text-slate-500 shadow-sm border border-slate-200">Cmd K</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowClosingModal(true)} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors md:hidden">
               <Moon size={20} />
            </button>
            <ProfileSelector />
          </div>
        </header>

        {/* Page Content with Slide Transition */}
        <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
               <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/*
        ════════════════════════════════════════════════════════
          MOBILE NAV — Organic Notch (Circle-Fitted)
        ════════════════════════════════════════════════════════

        SVG viewBox 0 0 100 68 + preserveAspectRatio=none
        → responsive at any screen width.

        Plus button:
          position: bottom 10px, right 16px
          center: x = screen - 44px (≈88.7% on 390px) , y = 38px from bottom
          center in SVG space: x=88.5, y = 68-38 = 30
          radius in SVG: 28px height / 68 = 0.41 normalized → fits at y=30±28

        SVG path wraps the notch around Plus's circumference + 6px clearance.
        The circle (r=28, center y=30) bottom at y=58. With clearance: y=64.
        The notch dips to y=65 at x=88.5 — hugging the bottom of Plus.

        Brain button:
          Floats ABOVE-LEFT of Plus in a clean diagonal.
          z-[100] (highest) ensures Brain is always touchable.

        Both SVG bar (z-40) and nav icons (z-50) are BELOW both FABs.
      */}

      {/* ── SVG Bar (Dual-fitted organic notch) ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 w-full z-[40] pointer-events-none"
        style={{ height: '68px' }}
      >
        <svg
          width="100%" height="100%"
          viewBox="0 0 100 68"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          <defs>
            <filter id="navCircleFit" x="-5%" y="-120%" width="115%" height="350%">
              <feDropShadow dx="0" dy="-3" stdDeviation="7" floodColor="rgba(0,0,0,0.07)" />
            </filter>
          </defs>
          <path
            d="M 0,68 L 0,0 L 68,0
               C 72,0 76,18 82,44
               C 85,58 87,64 88.5,65
               C 90,64 92,58 95,44
               C 98,22 99.5,4 100,0
               L 100,68 Z"
            fill="white"
            filter="url(#navCircleFit)"
          />
        </svg>
      </div>

      {/* ── Nav Icons (5 items, left 77%, well inside flat bar zone) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 z-[50] pointer-events-auto"
        style={{ height: '68px', width: '77%' }}
      >
        <div className="h-full flex items-center justify-around px-1">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path!}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-2xl transition-all duration-200 relative outline-none ${
                  isActive ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Ripple />
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                  <div
                    className={`h-[3px] rounded-full bg-blue-500 transition-all duration-200 ${
                      isActive ? 'w-5 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/*
        FABs — both independent fixed elements, z above SVG bar.
        Plus (z-95): CENTERED in the notch scoop.
        Brain (z-100): Diagonal ABOVE-LEFT of Plus, highest z = always touchable.
      */}

      {/* Plus FAB:
           /productividad → Home (volver a Finanzas)
           otras rutas    → abrir modal de transacción      */}
      <motion.button
        className={`md:hidden fixed z-[95] w-14 h-14 rounded-full flex items-center justify-center text-white overflow-hidden ${
          location.pathname === '/productividad' ? 'bg-slate-700' : 'bg-blue-500'
        }`}
        style={{
          bottom: '10px',
          right:  '16px',
          boxShadow: location.pathname === '/productividad'
            ? '0 8px 28px -4px rgba(30,41,59,0.45)'
            : '0 8px 28px -4px rgba(59,130,246,0.55)',
        }}
        onClick={() =>
          location.pathname === '/productividad'
            ? navigate('/dashboard')
            : setIsModalOpen(true)
        }
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        title={location.pathname === '/productividad' ? 'Volver a Finanzas' : 'Nuevo Registro'}
      >
        <Ripple />
        {location.pathname === '/productividad'
          ? <Home size={24} strokeWidth={2.5} />
          : <Plus size={26} strokeWidth={3} />}
      </motion.button>

      {/* Brain FAB:
           /productividad → oculto (ya estás ahí)
           otras rutas    → navegar a /productividad           */}
      {location.pathname !== '/productividad' && (
        <motion.button
          className="md:hidden fixed z-[100] w-12 h-12 rounded-full flex items-center justify-center bg-white text-blue-500 overflow-hidden"
          style={{
            bottom: '66px',
            right:  '54px',
            boxShadow: '0 6px 22px -4px rgba(0,0,0,0.12)',
            border: '1.5px solid #e2e8f0',
          }}
          onClick={() => navigate('/productividad')}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title="Segundo Cerebro"
        >
          <Ripple />
          <Brain size={22} strokeWidth={2.2} />
        </motion.button>
      )}

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

      {/* Global Modals for Instant Navigation */}
      <AnimatePresence>
          {showTransactionsModal && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-10">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransactionsModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} className="bg-slate-50 relative w-full h-full md:rounded-[3rem] shadow-2xl z-10 overflow-hidden flex flex-col">
                   <div className="flex justify-between items-center px-8 py-6 bg-white border-b border-slate-100 shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ScrollText size={20} /></div>
                         <h2 className="text-xl font-black text-slate-800 tracking-tight">Historial Completo</h2>
                      </div>
                      <button onClick={() => setShowTransactionsModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors outline-none"><X size={20} /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
                      <TransactionsView hideHeader={true} />
                   </div>
                </motion.div>
             </div>
          )}
      </AnimatePresence>

      {/* Global Transaction Modal (BottomSheet on Mobile, Centered on PC) */}
      <AnimatePresence>
         {isModalOpen && !isPomodoroRunning && (
            <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                 onClick={() => setIsModalOpen(false)} 
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
               />
               
               <motion.div 
                 initial={{ y: '100%', opacity: 0 }} 
                 animate={{ y: 0, opacity: 1 }} 
                 exit={{ y: '100%', opacity: 0 }} 
                 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                 className="relative w-full max-w-2xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] md:rounded-b-[2.5rem] shadow-2xl z-10 max-h-[90vh] flex flex-col"
               >
                 {/* Drag indicator for mobile */}
                 <div className="w-full flex justify-center pt-4 pb-2 md:hidden" onClick={() => setIsModalOpen(false)}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                 </div>

                 {/* Modal Header Minimalist */}
                 <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-blue-50/30 to-white md:rounded-t-[2.5rem] rounded-t-[2.5rem] border-b border-blue-50">
                    <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">Registro de Movimiento</h2>
                       <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">SofiLu Intelligent Vault</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white border border-slate-100 hover:border-blue-200 text-slate-400 hover:text-blue-500 rounded-full transition-all shadow-sm outline-none">
                       <X size={20} />
                    </button>
                 </div>
                 
                 {/* Modal flow content */}
                 <div className="flex-1 flex flex-col min-h-0">
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
