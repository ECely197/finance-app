import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Plus, TrendingUp, Settings, LogOut, ScrollText, Target, X } from 'lucide-react';
import { ProfileSelector } from './ProfileSelector';
import { TransactionForm } from '../transactions/TransactionForm';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export const MainLayout = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Historial', path: '/transactions', icon: ScrollText },
    { name: 'Metas', path: '/obligations', icon: Target },
    { name: 'Inversiones', path: '/investments', icon: TrendingUp },
    { name: 'Ajustes', path: '/settings', icon: Settings },
  ];

  const mobileNavItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Historial', path: '/transactions', icon: ScrollText },
    { name: 'FAB', isFab: true },
    { name: 'Metas', path: '/obligations', icon: Target },
    { name: 'Ajustes', path: '/settings', icon: Settings },
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row text-slate-800 overflow-x-hidden">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 p-6 fixed h-full z-10 shadow-[2px_0_20px_rgb(0,0,0,0.02)]">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
            F
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">FinanceApp</span>
        </div>
        <div className="mb-8 px-2">
           <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 py-3.5 rounded-full font-bold shadow-md shadow-blue-500/20 transition-all outline-none"
           >
              <Plus size={20} strokeWidth={2.5}/>
              Nueva Transacción
           </motion.button>
           <div className="flex justify-center mt-2.5">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm shrink-0">Presiona 'N'</span>
           </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.name}
                to={item.path!}
                className={({ isActive }) => 
                  `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-200 outline-none ${
                    isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className={isActive ? 'text-blue-600' : ''} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all w-full font-medium"
          >
            <LogOut size={22} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 mb-20 md:mb-0 w-full min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgb(0,0,0,0.02)]">
          <div className="md:hidden flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-500/20">F</div>
             <span className="font-bold tracking-tight text-slate-800">FinanceApp</span>
          </div>
          <div className="ml-auto">
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

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 pt-2 pb-5 z-40 shadow-[0_-10px_40px_rgb(0,0,0,0.04)] px-4">
         <div className="flex items-center justify-between relative max-w-md mx-auto">
            {mobileNavItems.map((item, idx) => {
               if (item.isFab) {
                  return (
                     <div key={`fab-${idx}`} className="relative -top-6 flex justify-center">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsModalOpen(true)}
                          className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-[1.2rem] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)] rotate-45 hover:rotate-90 transition-transform duration-300 z-50 outline-none"
                        >
                           <div className="-rotate-45 hover:-rotate-90 transition-transform duration-300">
                             <Plus size={30} strokeWidth={2.5}/>
                           </div>
                        </motion.button>
                     </div>
                  );
               }
               
               return (
                 <NavLink
                   key={item.name}
                   to={item.path!}
                   className={({ isActive }) => 
                     `flex flex-col items-center gap-1 p-2 w-14 sm:w-16 transition-colors relative outline-none ${
                       isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                     }`
                   }
                 >
                   <div className="p-1">
                     {/* @ts-ignore */}
                     <item.icon size={22} strokeWidth={2.5} />
                   </div>
                   <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate w-full text-center">{item.name}</span>
                 </NavLink>
               );
            })}
         </div>
      </nav>

      {/* Global Transaction Modal (BottomSheet on Mobile, Centered on PC) */}
      <AnimatePresence>
         {isModalOpen && (
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

                 {/* Close button for desktop */}
                 <button onClick={() => setIsModalOpen(false)} className="hidden md:flex absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors z-20 outline-none">
                    <X size={20} />
                 </button>
                 
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
  );
};
