import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PlusCircle, TrendingUp, Settings, LogOut, ScrollText, Target } from 'lucide-react';
import { ProfileSelector } from './ProfileSelector';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export const MainLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Historial', path: '/transactions', icon: ScrollText },
    { name: 'Añadir', path: '/add', icon: PlusCircle },
    { name: 'Metas', path: '/obligations', icon: Target },
    { name: 'Inversiones', path: '/investments', icon: TrendingUp },
    { name: 'Ajustes', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

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
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isAdd = item.path === '/add';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-200 ${
                    isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : isAdd 
                      ? 'text-slate-600 hover:bg-slate-50' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className={isActive || isAdd ? 'text-blue-600' : ''} />
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-100 flex items-center justify-around px-2 py-2 pb-safe z-30 shadow-[0_-10px_40px_rgb(0,0,0,0.04)]">
        {navItems.map((item) => {
           const isAdd = item.path === '/add';
           return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors relative ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <div className={`${isAdd ? 'bg-blue-600 text-white p-3.5 rounded-2xl -mt-8 shadow-lg shadow-blue-500/30' : 'p-1'}`}>
                <item.icon size={isAdd ? 24 : 22} strokeWidth={isAdd ? 2.5 : 2} />
              </div>
              {!isAdd && <span className="text-[11px] font-medium tracking-tight mt-0.5">{item.name}</span>}
              {/* Active Indicator on bottom nav */}
              {/* <div className={`absolute -bottom-2 w-1 h-1 rounded-full bg-blue-600 transition-opacity ${isActive && !isAdd ? 'opacity-100' : 'opacity-0'}`} /> */}
            </NavLink>
          );
        })}
      </nav>
      
    </div>
  );
};
