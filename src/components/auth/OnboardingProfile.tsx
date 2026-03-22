import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { createProfile } from '../../lib/firestore';
import { Briefcase, User as UserIcon } from 'lucide-react';

export const OnboardingProfile = () => {
  const { user, setProfiles, setCurrentProfile } = useAppStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'Personal' | 'Business' | 'Project'>('Personal');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      const newId = crypto.randomUUID();
      const profileData = { id: newId, name: name.trim(), type, createdAt: new Date() };
      await createProfile(user.uid, newId, profileData);
      
      setProfiles([profileData]);
      setCurrentProfile(profileData);
    } catch (err) {
      console.error("Error creating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-full max-w-md text-center overflow-hidden"
      >
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
             <UserIcon size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Crea tu primer espacio</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">Necesitas al menos un espacio de trabajo para comenzar a registrar tus finanzas. Puedes crear más después en los ajustes.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6 text-left">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre del Espacio</label>
            <input 
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-700"
              placeholder="Ej. Personal, Negocio de Ropa..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selecciona un Tipo</label>
            <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setType('Personal')}
                 className={`py-4 flex flex-col items-center gap-2 rounded-2xl border-2 transition-all ${type === 'Personal' ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
               >
                 <UserIcon size={24} /> <span className="text-sm font-semibold">Personal</span>
               </button>
               <button type="button" onClick={() => setType('Business')}
                 className={`py-4 flex flex-col items-center gap-2 rounded-2xl border-2 transition-all ${type === 'Business' ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
               >
                 <Briefcase size={24} /> <span className="text-sm font-semibold">Negocio</span>
               </button>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-4.5 px-6 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-2xl transition-all shadow-[0_4px_14px_rgb(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-lg mt-2"
          >
            {loading ? 'Creando espacio...' : 'Comenzar a organizar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
