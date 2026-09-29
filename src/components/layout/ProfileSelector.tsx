import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Profile } from '../../store/useAppStore';
import { ChevronDown, Briefcase, User as UserIcon, Check, Plus, X } from 'lucide-react';
import { createProfile } from '../../lib/firestore';

export const ProfileSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profiles, setProfiles, currentProfile, setCurrentProfile } = useAppStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Personal' | 'Business' | 'Project'>('Personal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showModal) return;
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

  const handleCreateProfile = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !newName.trim()) return;
     setLoading(true);
     try {
        const id = crypto.randomUUID();
        const profileData: Profile = { id, name: newName.trim(), type: newType, createdAt: new Date() };
        await createProfile(user.uid, id, profileData as any);
        
        const updatedProfiles = [...profiles, profileData];
        setProfiles(updatedProfiles);
        setCurrentProfile(profileData);
        
        setNewName('');
        setNewType('Personal');
        setShowModal(false);
        setIsOpen(false);
     } catch (err) {
        console.error(err);
     } finally {
        setLoading(false);
     }
  };

  if (!currentProfile) {
     return <div className="h-10 w-32 bg-slate-200/50 dark:bg-white/5 animate-pulse rounded-2xl" />;
  }

  return (
    <>
      <div className="relative z-50" ref={menuRef}>
        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-white/70 dark:bg-zinc-900/55 backdrop-blur-2xl hover:bg-white/90 dark:hover:bg-zinc-900/80 border border-white/40 dark:border-white/[0.08] rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.06)] active:scale-[0.96]"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] flex items-center justify-center font-bold">
            {currentProfile.type === 'Business' ? <Briefcase size={15} /> : <UserIcon size={15} />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{currentProfile.name}</p>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 leading-tight">{currentProfile.type}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 dark:text-zinc-400 ml-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute top-full right-0 origin-top-right mt-2 w-64 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.25)] border border-white/40 dark:border-white/10 overflow-hidden z-50 p-2"
            >
              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Tus Espacios</p>
              <div className="space-y-1">
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      setCurrentProfile(profile);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                      currentProfile.id === profile.id 
                        ? 'bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] font-bold' 
                        : 'hover:bg-slate-100/70 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        currentProfile.id === profile.id ? 'bg-[#0381FE]/20 text-[#0381FE]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                      }`}>
                        {profile.type === 'Business' ? <Briefcase size={13} /> : <UserIcon size={13} />}
                      </div>
                      <span className="text-xs font-bold">{profile.name}</span>
                    </div>
                    {currentProfile.id === profile.id && <Check size={14} className="text-[#0381FE] dark:text-[#387AFF]" />}
                  </button>
                ))}
              </div>
              
              <div className="h-px bg-black/5 dark:bg-white/5 my-1.5 mx-1" />
              
              <button 
                onClick={() => setShowModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/5 text-slate-600 dark:text-zinc-400 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-[#0381FE] group-hover:bg-[#0381FE]/10 transition-colors">
                  <Plus size={14} className="text-slate-400 group-hover:text-[#0381FE]" />
                </div>
                <span className="text-xs font-bold">Crear nuevo espacio</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Profile Modal - One UI Bottom Sheet */}
      <AnimatePresence>
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 onClick={() => !loading && setShowModal(false)}
                 className="absolute inset-0 bg-black/60 backdrop-blur-md"
               />
               
               <motion.div 
                 initial={{ opacity: 0, y: 40, scale: 0.98 }} 
                 animate={{ opacity: 1, y: 0, scale: 1 }} 
                 exit={{ opacity: 0, y: 40, scale: 0.98 }} 
                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                 className="bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden z-10 p-6 sm:p-8 border border-white/20 dark:border-white/5"
               >
                 <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0 sm:hidden" />
                 
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 bg-[#0381FE]/15 text-[#0381FE] dark:text-[#387AFF] rounded-2xl flex items-center justify-center mb-2">
                       <Plus size={22} strokeWidth={2.5}/>
                    </div>
                    <button onClick={() => !loading && setShowModal(false)} className="p-2 bg-slate-100 dark:bg-[#1C1C1E] text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors">
                       <X size={18} />
                    </button>
                 </div>
                 
                 <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Nuevo Espacio</h3>
                 <p className="text-slate-500 dark:text-zinc-400 font-medium text-xs mb-6">Crea un perfil aislado para manejar tus finanzas.</p>

                 <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Nombre del espacio</label>
                      <input 
                        type="text" autoFocus required value={newName} onChange={e => setNewName(e.target.value)} 
                        placeholder="Ej. Finanzas Personales" 
                        className="w-full px-4 py-3.5 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all font-bold text-slate-800 dark:text-white text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-zinc-500 mb-1.5 uppercase tracking-widest">Tipo de espacio</label>
                      <select 
                        value={newType} onChange={(e: any) => setNewType(e.target.value)} 
                        className="w-full px-4 py-3.5 bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all font-bold text-slate-800 dark:text-white text-sm appearance-none cursor-pointer"
                      >
                        <option value="Personal" className="bg-white dark:bg-[#17171A]">Personal</option>
                        <option value="Business" className="bg-white dark:bg-[#17171A]">Negocio</option>
                        <option value="Project" className="bg-white dark:bg-[#17171A]">Proyecto</option>
                      </select>
                    </div>

                    <div className="pt-3 flex gap-3">
                       <button type="button" onClick={() => setShowModal(false)} disabled={loading} className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold rounded-2xl transition-all text-sm">
                          Cancelar
                       </button>
                       <button type="submit" disabled={loading || !newName.trim()} className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-4 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60 text-sm">
                          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Crear Espacio'}
                       </button>
                    </div>
                 </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </>
  );
};
