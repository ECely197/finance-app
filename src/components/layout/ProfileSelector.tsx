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
      // Avoid closing if interacting with the modal
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

  // Return a placeholder if no profile is loaded yet
  if (!currentProfile) {
     return <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-xl" />;
  }

  return (
    <>
      <div className="relative z-50" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            {currentProfile.type === 'Business' ? <Briefcase size={16} /> : <UserIcon size={16} />}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{currentProfile.name}</p>
            <p className="text-[11px] font-medium text-slate-400 leading-tight">{currentProfile.type}</p>
          </div>
          <ChevronDown size={14} className={`text-slate-400 ml-1 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full right-0 origin-top-right mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] border border-slate-100 overflow-hidden"
            >
              <div className="p-3">
                <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tus Espacios</p>
                <div className="space-y-1">
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setCurrentProfile(profile);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${currentProfile.id === profile.id ? 'bg-blue-50/80 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${currentProfile.id === profile.id ? 'bg-blue-100/50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {profile.type === 'Business' ? <Briefcase size={14} /> : <UserIcon size={14} />}
                        </div>
                        <span className="text-sm font-medium">{profile.name}</span>
                      </div>
                      {currentProfile.id === profile.id && <Check size={16} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
                
                <div className="h-px bg-slate-100 my-2 mx-1" />
                
                <button 
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-xl border border-dashed border-slate-300 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-colors">
                    <Plus size={16} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <span className="text-sm font-medium">Crear nuevo espacio</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Profile Modal */}
      <AnimatePresence>
         {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 onClick={() => !loading && setShowModal(false)}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
               />
               
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                 animate={{ opacity: 1, scale: 1, y: 0 }} 
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden z-10"
               >
                 <div className="p-8">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                         <Plus size={24} strokeWidth={2.5}/>
                      </div>
                      <button onClick={() => !loading && setShowModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                         <X size={20} />
                      </button>
                   </div>
                   
                   <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Nuevo Espacio</h3>
                   <p className="text-slate-500 font-medium text-sm mb-8">Crea un perfil aislado para manejar tus finanzas.</p>

                   <form onSubmit={handleCreateProfile} className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Nombre del espacio</label>
                        <input 
                          type="text" autoFocus required value={newName} onChange={e => setNewName(e.target.value)} 
                          placeholder="Ej. Finanzas Personales" 
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-800" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Tipo de espacio</label>
                        <select 
                          value={newType} onChange={(e: any) => setNewType(e.target.value)} 
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-800 appearance-none cursor-pointer"
                        >
                          <option value="Personal">Personal</option>
                          <option value="Business">Negocio</option>
                          <option value="Project">Proyecto</option>
                        </select>
                      </div>

                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setShowModal(false)} disabled={loading} className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all">
                            Cancelar
                         </button>
                         <button type="submit" disabled={loading || !newName.trim()} className="flex-[2] flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70">
                            {loading ? <div className="w-5 h-5 border-2 border-slate-200 border-t-white rounded-full animate-spin" /> : 'Crear Espacio'}
                         </button>
                      </div>
                   </form>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </>
  );
};
