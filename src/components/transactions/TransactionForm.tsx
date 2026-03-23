import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { createTransaction, getCategories, getInvestments } from '../../lib/firestore';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircle2, DollarSign, Calendar, FileText, Link2, Briefcase, User as UserIcon, Tag, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const transactionTypes = [
  { id: 'ingreso', label: 'Ingreso', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'gasto_fijo', label: 'Gasto Fijo', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'gasto_variable', label: 'Gasto Variable', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'gasto_innecesario', label: 'Innecesario', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'inversion', label: 'Inversión', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
];

export const TransactionForm = ({ onComplete }: { onComplete?: () => void }) => {
  const navigate = useNavigate();
  const { user, profiles, currentProfile } = useAppStore();
  
  // Form states
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfile?.id || '');
  const [type, setType] = useState('gasto_variable');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [inversionIdRelacionada, setInversionIdRelacionada] = useState('');
  
  // Data states
  const [categories, setCategories] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (currentProfile?.id && !selectedProfileId) {
       setSelectedProfileId(currentProfile.id);
    }
  }, [currentProfile, selectedProfileId]);

  useEffect(() => {
    if (!user || !selectedProfileId) return;
    
    const loadMetadata = async () => {
      try {
        const cats = await getCategories(user.uid, selectedProfileId);
        const invs = await getInvestments(user.uid, selectedProfileId);
        
        // Smart Sorting by Frequency
        try {
           const txRef = collection(db, `users/${user.uid}/profiles/${selectedProfileId}/transactions`);
           const qTx = query(txRef, orderBy('date', 'desc'), limit(50));
           const txSnap = await getDocs(qTx);
           const freq: Record<string, number> = {};
           txSnap.docs.forEach(d => {
              const t = d.data();
              if (t.categoryId) freq[t.categoryId] = (freq[t.categoryId] || 0) + 1;
           });
           cats.sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
        } catch(e) { console.error("Error sorting categories", e); }

        setCategories(cats);
        if (!cats.find(c => c.id === categoryId)) setCategoryId('');
        setInvestments(invs);
      } catch (err) {
        console.error("Error loading metadata:", err);
      }
    };
    
    loadMetadata();
  }, [user, selectedProfileId]); // removed categoryId to avoid loops

  const filteredCategories = categories.filter(c => {
     if (!c.type || c.type === 'general') return true;
     if (type === 'ingreso' || type === 'inversion') return c.type === 'ingreso';
     return c.type === 'gasto';
  });

  const activeProfile = profiles.find(p => p.id === selectedProfileId);
  const showInvestmentLink = type === 'ingreso' && activeProfile?.type === 'Business';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProfileId || !amount || !categoryId) {
       if (!categoryId) {
          setToastMessage('Debes seleccionar una categoría');
          setTimeout(() => setToastMessage(''), 4000);
       }
       return;
    }
    
    setLoading(true);
    try {
      const txId = crypto.randomUUID();
      await createTransaction(user.uid, selectedProfileId, txId, {
        amount: parseFloat(amount),
        type: type as any,
        date: new Date(date + 'T12:00:00'),
        categoryId: categoryId,
        description,
        ...(showInvestmentLink && inversionIdRelacionada ? { inversionIdRelacionada } : {})
      });
      
      // Reset form fields but keep selected profile and type
      setAmount('');
      setCategoryId('');
      setDescription('');
      
      setSuccessAnim(true);
      setTimeout(() => {
         setSuccessAnim(false);
         if (onComplete) onComplete();
      }, 1000);
      
    } catch (error) {
       console.error(error);
       setToastMessage('Error al guardar el movimiento');
       setTimeout(() => setToastMessage(''), 4000);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col relative min-h-0">
      <AnimatePresence>
        {successAnim && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem]"
           >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(16,185,129,0.4)] text-white mb-4"
              >
                 <Check size={48} strokeWidth={3} />
              </motion.div>
              <h3 className="text-2xl font-extrabold text-slate-800">¡Bóveda Actualizada!</h3>
              <p className="text-slate-500 font-bold mt-2">Movimiento registrado</p>
           </motion.div>
        )}
        
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${toastMessage.includes('Debes') || toastMessage.includes('Error') ? 'bg-rose-600' : 'bg-slate-800'} text-white px-6 py-3.5 rounded-full shadow-lg shadow-slate-800/20 font-bold flex items-center gap-2`}
          >
             {!toastMessage.includes('Debes') && !toastMessage.includes('Error') && <CheckCircle2 size={20} className="text-emerald-400" />}
             {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-4 pb-[80px] custom-scrollbar space-y-8">
            <div className="mb-2">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Registro</h2>
              <p className="text-slate-500 font-medium mt-1">Añade un nuevo movimiento.</p>
            </div>
          
          {/* Perfil */}
          <div>
            <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">Espacio / Perfil</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {profiles.map(p => (
                 <button
                   key={p.id}
                   type="button"
                   onClick={() => setSelectedProfileId(p.id)}
                   className={`flex items-center justify-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all font-bold text-sm
                    ${selectedProfileId === p.id 
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm shadow-blue-500/10' 
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
                 >
                    {p.type === 'Business' ? <Briefcase size={18} /> : <UserIcon size={18} />}
                    <span className="truncate">{p.name}</span>
                 </button>
              ))}
            </div>
          </div>

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">Tipo de Operación</label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {transactionTypes.map((t) => (
                <motion.button
                  key={t.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setType(t.id)}
                  className={`px-2 py-3 mr-0 rounded-2xl text-[13px] font-bold border-2 transition-all duration-200 truncate shadow-sm
                    ${type === t.id 
                      ? `${t.bg} ${t.color} ${t.border}` 
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {t.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {/* Monto */}
            <div>
              <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">Monto Total</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <DollarSign size={22} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-extrabold text-slate-800 text-xl"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Categorías (Chips) */}
          <div>
            <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">¿En qué categoría?</label>
            {filteredCategories.length === 0 ? (
               <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-6 text-center shadow-sm">
                  <p className="text-slate-500 font-bold mb-3">No hay categorías para este tipo de movimiento.</p>
                  <button type="button" onClick={() => navigate('/settings')} className="bg-white border border-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:bg-slate-100 transition-all active:scale-95">
                     Ir a Ajustes para crearlas
                  </button>
               </div>
            ) : (
               <div className="flex flex-wrap gap-2">
                 {filteredCategories.map((cat, idx) => {
                   const isTop = idx < 3;
                   return (
                     <motion.button
                       key={cat.id}
                       type="button"
                       whileTap={{ scale: 0.95 }}
                       onClick={() => setCategoryId(cat.id)}
                       className={`px-4 py-3 rounded-full font-bold transition-all border flex items-center gap-1.5 ${
                          categoryId === cat.id 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30' 
                            : isTop
                              ? 'bg-blue-50/50 border-blue-100 text-blue-700 hover:bg-blue-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                       } ${isTop ? 'text-[15px]' : 'text-[13px]'}`}
                     >
                       {isTop && <Tag size={14} className={categoryId === cat.id ? 'text-white/80' : 'text-blue-500/50'} />}
                       {cat.name}
                     </motion.button>
                   );
                 })}
               </div>
            )}
          </div>

          {/* Vinculación a Inversión */}
          <AnimatePresence>
            {showInvestmentLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                 <div className="pt-2">
                    <label className="block text-sm font-extrabold text-indigo-500 uppercase tracking-widest mb-3 border-t border-indigo-50 pt-4 mt-2">¿Vincular a Inversión previa? (Para RSI)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Link2 size={20} className="text-indigo-400" />
                      </div>
                      <select
                        value={inversionIdRelacionada}
                        onChange={(e) => setInversionIdRelacionada(e.target.value)}
                        className="w-full pl-12 pr-10 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                      >
                        <option value="">Ingreso Independiente (No vincular)</option>
                        {investments.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            Inversión: ${inv.amount} - {inv.description || "Capital"}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon />
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">Descripción (Libre)</label>
            <div className="relative">
              <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                <FileText size={20} className="text-slate-400" />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 resize-none leading-relaxed"
                placeholder="Detalles sueltos del registro para identificarlos (ej. Modelo del producto)"
              />
            </div>
          </div>

          {/* Resto de Datos Ocultos (Fecha) */}
          <div>
             <button type="button" onClick={() => setShowDate(!showDate)} className="text-sm font-extrabold text-blue-500 hover:text-blue-600 flex items-center gap-2">
                {showDate ? 'Ocultar fecha manual' : 'Cambiar fecha (Por defecto Hoy)'}
             </button>
             <AnimatePresence>
                {showDate && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 overflow-hidden">
                    <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-3">Día de la Operación</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar size={20} className="text-slate-400" />
                      </div>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 cursor-pointer text-lg"
                      />
                    </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 p-5 md:p-6 border-t border-slate-100 bg-white/95 backdrop-blur-md z-20 pb-safe">
            <button
              type="submit"
              disabled={loading || profiles.length === 0}
              className="w-full py-4 px-6 bg-slate-900 hover:bg-black text-white font-extrabold rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                 <>
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                    Registrando...
                 </>
              ) : 'Registrar en Bóveda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChevronDownIcon = () => (
  <svg 
    className="absolute right-4 top-[18px] text-indigo-400 pointer-events-none" 
    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
