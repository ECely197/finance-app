import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { createRecurringExpense, updateRecurringExpense, deleteRecurringExpense, getCategories } from '../../lib/firestore';
import { Plus, Trash2, CalendarClock, Tag, RefreshCw, Edit2 } from 'lucide-react';

export const RecurringExpensesView = () => {
  const { user, currentProfile } = useAppStore();
  const { recurringExpenses, loading } = useRecurringExpenses();
  const [categories, setCategories] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [monto, setMonto] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frecuencia, setFrecuencia] = useState('mensual');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && currentProfile) {
       getCategories(user.uid, currentProfile.id).then(setCategories);
    }
  }, [user, currentProfile]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentProfile || !titulo.trim() || !monto || !categoryId) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateRecurringExpense(user.uid, currentProfile.id, editingId, {
          titulo: titulo.trim(),
          monto: Number(monto),
          categoryId,
          frecuencia
        });
      } else {
        await createRecurringExpense(user.uid, currentProfile.id, {
          titulo: titulo.trim(),
          monto: Number(monto),
          categoryId,
          frecuencia,
          ultimoPago: null,
          createdAt: new Date()
        });
      }
      resetForm();
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const resetForm = () => {
    setTitulo('');
    setMonto('');
    setCategoryId('');
    setFrecuencia('mensual');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditClick = (expense: any) => {
    setTitulo(expense.titulo);
    setMonto(expense.monto.toString());
    setCategoryId(expense.categoryId);
    setFrecuencia(expense.frecuencia);
    setEditingId(expense.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user || !currentProfile) return;
    if (!window.confirm(`¿Seguro que deseas eliminar el gasto recurrente "${name}"?`)) return;
    try {
      await deleteRecurringExpense(user.uid, currentProfile.id, id);
    } catch (err) { console.error(err); }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO')}`;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants: any = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gastos Fijos</h2>
          <p className="text-slate-500 font-medium mt-1">Automatiza y proyecta tus cuentas por pagar en <b>{currentProfile?.name}</b></p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95">
           <Plus size={18} strokeWidth={2.5}/> Nuevo Gasto
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleCreateOrUpdate} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col gap-4 mt-6">
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">
                 {editingId ? 'Editar Gasto Recurrente' : 'Configurar Gasto Recurrente'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Nombre del Gasto</label>
                  <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Arriendo Oficina" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Monto</label>
                  <input type="number" required value={monto} onChange={e => setMonto(e.target.value)} placeholder="Ej. 500000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Categoría</label>
                  <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700">
                    <option value="" disabled>Selecciona una categoría...</option>
                    {categories.filter(c => c.type === 'gasto' || c.type === 'general').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest">Frecuencia</label>
                  <select value={frecuencia} onChange={e => setFrecuencia(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-700">
                    <option value="mensual">Mensual</option>
                    <option value="semanal" disabled>Semanal (Próximamente)</option>
                    <option value="anual" disabled>Anual (Próximamente)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={resetForm} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting || !titulo.trim() || !monto || !categoryId} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50">
                  {editingId ? 'Guardar Cambios' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : recurringExpenses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-[2.5rem] p-12 text-center shadow-sm flex flex-col items-center mt-6">
           <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-3xl flex items-center justify-center mb-6">
              <CalendarClock size={36} strokeWidth={2} />
           </div>
           <h3 className="text-xl font-bold text-slate-800 mb-2">No tienes gastos fijos configurados</h3>
           <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-8">
              Añade el arriendo, servicios, suscripciones y otras obligaciones recurrentes para proyectar tu saldo libre mensualmente en el Dashboard.
           </p>
           <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm">
              <Plus size={18} strokeWidth={2.5}/> Empezar a automatizar
           </button>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 mt-6">
          {recurringExpenses.map(expense => {
            const catName = categories.find(c => c.id === expense.categoryId)?.name || 'General';
            return (
              <motion.div key={expense.id} variants={itemVariants} className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_30px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                     <RefreshCw size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">{expense.titulo}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100 flex items-center gap-1">
                        <Tag size={10} /> {catName}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {expense.frecuencia}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                  <div className="flex flex-col sm:items-end">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Monto</span>
                    <span className="font-black text-slate-700 text-xl tracking-tight">{formatCurrency(expense.monto)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(expense)} className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(expense.id, expense.titulo)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
