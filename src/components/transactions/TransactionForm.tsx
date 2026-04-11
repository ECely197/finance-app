import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { createTransaction, getCategories, getInvestments, createSeparado } from '../../lib/firestore';
import { uploadSeparadoImage } from '../../lib/storage';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CheckCircle2, DollarSign, Calendar, Link2, Briefcase, User as UserIcon, Tag, Check, Image as ImageIcon } from 'lucide-react';
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
  
  // Separados states
  const [isSeparado, setIsSeparado] = useState(false);
  const [valorTotal, setValorTotal] = useState('');
  const [fotoProd, setFotoProd] = useState<File | null>(null);
  
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
      
      // Separados Logic
      if (type === 'ingreso' && isSeparado) {
         if (!valorTotal || Number(valorTotal) <= 0) {
            setToastMessage('Error: Valor Total inválido para el separado');
            setTimeout(() => setToastMessage(''), 4000);
            setLoading(false);
            return;
         }
         
         let fotoUrl = '';
         if (fotoProd) {
            fotoUrl = await uploadSeparadoImage(user.uid, selectedProfileId, fotoProd);
         }

         await createSeparado(user.uid, selectedProfileId, {
            fotoUrl,
            valorTotal: Number(valorTotal),
            totalAbonado: parseFloat(amount),
            cliente: description.trim(),
            estado: 'pendiente',
            createdAt: new Date()
         });
      }

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
      setIsSeparado(false);
      setValorTotal('');
      setFotoProd(null);
      
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
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-white">
      <AnimatePresence>
        {successAnim && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem]"
           >
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(16,185,129,0.3)] text-white mb-6"
              >
                 <Check size={48} strokeWidth={3} />
              </motion.div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Bóveda Actualizada!</h3>
              <p className="text-slate-500 font-bold mt-2">Movimiento registrado con éxito</p>
           </motion.div>
        )}
        
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] ${toastMessage.includes('Debes') || toastMessage.includes('Error') ? 'bg-rose-600' : 'bg-slate-800'} text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold`}
          >
             {!toastMessage.includes('Debes') && !toastMessage.includes('Error') && <CheckCircle2 size={20} className="text-emerald-400" />}
             {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-8 pb-32 custom-scrollbar space-y-8">
          
          {/* 1. Selector de Espacio */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Espacio de Trabajo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profiles.map(p => (
                 <button
                   key={p.id}
                   type="button"
                   onClick={() => setSelectedProfileId(p.id)}
                   className={`flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl border-2 transition-all font-bold text-sm
                    ${selectedProfileId === p.id 
                      ? 'border-blue-500 bg-blue-50/30 text-blue-700 shadow-sm' 
                      : 'border-slate-50 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                 >
                    {p.type === 'Business' ? <Briefcase size={18} /> : <UserIcon size={18} />}
                    <span className="truncate">{p.name}</span>
                 </button>
              ))}
            </div>
          </div>

          {/* 2. Tipo de Operación (Chips Responsivos) */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Tipo de Movimiento</label>
            <div className="flex flex-wrap gap-2">
              {transactionTypes.map((t) => {
                const isActive = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex-1 min-w-[130px] sm:min-w-[110px] py-3 px-4 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 border-2
                      ${isActive 
                        ? 'bg-blue-50/50 border-blue-500/20 text-blue-700 shadow-sm' 
                        : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                      }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Toggle Separados (Condicional) */}
          <AnimatePresence>
            {type === 'ingreso' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div 
                  className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all cursor-pointer ${isSeparado ? 'bg-emerald-50/50 border-emerald-500/30' : 'bg-slate-50/50 border-transparent hover:bg-slate-50'}`}
                  onClick={() => setIsSeparado(!isSeparado)}
                >
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-colors ${isSeparado ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                         <Tag size={20} />
                      </div>
                      <div>
                         <h4 className="font-extrabold text-slate-800 text-sm">Registrar Separado</h4>
                         <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Abonos y Ventas Especiales</p>
                      </div>
                   </div>
                   <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isSeparado ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      <motion.div 
                        animate={{ x: isSeparado ? 24 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-md" 
                      />
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Monto & Separado Details */}
          <div className="space-y-4">
            <div className="bg-white rounded-[2.2rem] border border-slate-100 p-10 shadow-sm">
               <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Monto Principal</label>
               <div className="flex items-center gap-6 pr-4">
                  <div className="w-16 h-16 rounded-[1.4rem] bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
                     <DollarSign size={32} strokeWidth={2.5} />
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    required={!isSeparado}
                    value={amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-5xl font-black text-slate-800 placeholder:text-slate-100 outline-none"
                  />
               </div>
            </div>

            <AnimatePresence>
              {isSeparado && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-emerald-50/30 border border-emerald-100 rounded-[2.2rem] p-8 space-y-6">
                   <div>
                     <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Valor Total de la Venta</label>
                     <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                           <DollarSign size={20} className="text-emerald-400" />
                        </div>
                        <input
                           type="number"
                           required={isSeparado}
                           value={valorTotal}
                           onChange={(e) => setValorTotal(e.target.value)}
                           className="w-full pl-14 pr-6 py-5 bg-white border border-emerald-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all font-black text-slate-700 text-xl shadow-sm"
                           placeholder="0.00"
                        />
                     </div>
                   </div>

                   <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Foto del Producto (Opcional)</label>
                     <label className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-[1.5rem] py-5 px-6 transition-all cursor-pointer shadow-sm">
                        <ImageIcon size={22} />
                        <span className="font-bold text-sm truncate">{fotoProd ? fotoProd.name : 'Subir Imagen'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoProd(e.target.files?.[0] || null)} />
                     </label>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Categorías */}
          <div className="space-y-4">
             <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</label>
             {filteredCategories.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
                   <p className="text-slate-400 font-bold mb-4 text-sm">No hay categorías configuradas.</p>
                   <button type="button" onClick={() => navigate('/settings')} className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-3 rounded-2xl hover:bg-slate-100 transition-all text-sm shadow-sm">
                      Configurar Categorías
                   </button>
                </div>
             ) : (
                <div className="flex flex-wrap gap-2.5">
                  {filteredCategories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategoryId(cat.id)}
                      className={`px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.1em] transition-all border-2
                        ${categoryId === cat.id 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200 hover:text-slate-600 shadow-sm'
                        }`}
                    >
                      {cat.name}
                    </motion.button>
                  ))}
                </div>
             )}
          </div>

          {/* 6. Detalles Adicionales */}
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Descripción / Nota</label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-50 rounded-[1.8rem] focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 resize-none text-sm placeholder:text-slate-300"
                  placeholder={isSeparado ? "Ej. Juan Perez - Tenis Nike 42" : "Ej. Compras de víveres"}
                />
              </div>
            </div>

            {showInvestmentLink && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Vincular a Inversión previa (RSI)</label>
                <div className="relative">
                  <select
                    value={inversionIdRelacionada}
                    onChange={(e) => setInversionIdRelacionada(e.target.value)}
                    className="w-full pl-6 pr-12 py-5 bg-indigo-50/50 border border-indigo-100 rounded-[1.8rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 appearance-none cursor-pointer text-sm"
                  >
                    <option value="">Ingreso Independiente</option>
                    {investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        Inversión: ${inv.amount.toLocaleString()} - {inv.description || "Capital"}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
                    <Link2 size={18} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <button 
                type="button" 
                onClick={() => setShowDate(!showDate)} 
                className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest flex items-center gap-2 px-1"
              >
                 <Calendar size={14} />
                 {showDate ? 'Cerrar selector de fecha' : 'Cambiar fecha del registro'}
              </button>
              <AnimatePresence>
                 {showDate && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 overflow-hidden">
                     <input
                       type="date"
                       required
                       value={date}
                       onChange={(e) => setDate(e.target.value)}
                       className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:outline-none font-bold text-slate-700 text-sm shadow-sm"
                     />
                   </motion.div>
                 )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-6 md:px-10 border-t border-slate-50 bg-white/80 backdrop-blur-xl flex gap-4">
          <button
            type="button"
            onClick={() => onComplete && onComplete()}
            className="flex-1 py-5 px-6 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-black uppercase tracking-[0.1em] rounded-[1.8rem] transition-all text-[11px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || profiles.length === 0}
            className="flex-[2] py-5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-[11px]"
          >
            {loading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={16} />
                Registrar Movimiento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
