import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Profile } from '../../store/useAppStore';
import {
  createProfile,
  updateProfile,
  deleteProfile,
  getCategories,
  createCategory,
  deleteCategory,
} from '../../lib/firestore';
import {
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  User as UserIcon,
  X,
  Check,
  Tag,
  CreditCard,
  RotateCcw,
  Save,
  CheckCircle2,
  Wallet,
  Package,
} from 'lucide-react';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import type { PaymentMethodConfig } from '../../types/paymentMethods';

export const SettingsView = () => {
  const { user, profiles, setProfiles, currentProfile, setCurrentProfile } = useAppStore();

  // Profile state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Personal' | 'Business' | 'Project'>('Personal');
  const [editName, setEditName] = useState('');

  // Category state
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('gasto');

  // Payment Gateways state
  const { methods, saveMethods, resetToDefaults, addCustomMethod, deleteMethod } = usePaymentMethods();
  const [editableGateways, setEditableGateways] = useState<PaymentMethodConfig[]>([]);
  const [isSavingGateways, setIsSavingGateways] = useState(false);
  const [gatewayToast, setGatewayToast] = useState('');

  // Custom Gateway Form state
  const [showAddCustomGateway, setShowAddCustomGateway] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [customDays, setCustomDays] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && currentProfile) {
      getCategories(user.uid, currentProfile.id).then(setCategories);
    }
  }, [user, currentProfile]);

  useEffect(() => {
    setEditableGateways(methods);
  }, [methods]);

  const showToast = (msg: string) => {
    setGatewayToast(msg);
    setTimeout(() => setGatewayToast(''), 4000);
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setLoading(true);
    try {
      const id = crypto.randomUUID();
      const profileData: Profile = { id, name: newName.trim(), type: newType, createdAt: new Date() };
      await createProfile(user.uid, id, profileData as any);
      const newProfiles = [...profiles, profileData];
      setProfiles(newProfiles);
      setIsAdding(false);
      setNewName('');
      setNewType('Personal');
      if (profiles.length === 0) setCurrentProfile(profileData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (profileId: string) => {
    if (!user || !editName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(user.uid, profileId, { name: editName.trim() });
      const updated = profiles.map((p) => (p.id === profileId ? { ...p, name: editName.trim() } : p));
      setProfiles(updated);
      if (currentProfile?.id === profileId) {
        setCurrentProfile(updated.find((p) => p.id === profileId) || null);
      }
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!user) return;
    if (
      !window.confirm(
        '¿Seguro que deseas eliminar este perfil? Sus transacciones seguirán existiendo en base de datos pero el espacio desaparecerá.'
      )
    )
      return;
    setLoading(true);
    try {
      await deleteProfile(user.uid, profileId);
      const updated = profiles.filter((p) => p.id !== profileId);
      setProfiles(updated);
      if (currentProfile?.id === profileId) {
        setCurrentProfile(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentProfile || !newCatName.trim()) return;
    setLoading(true);
    try {
      const id = crypto.randomUUID();
      const formattedName = newCatName.trim();
      await createCategory(user.uid, currentProfile.id, id, formattedName, newCatType);
      setCategories([...categories, { id, name: formattedName, type: newCatType }]);
      setNewCatName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!user || !currentProfile) return;
    if (!window.confirm(`¿Eliminar la categoría "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteCategory(user.uid, currentProfile.id, id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Gateway handlers
  const handleGatewayChange = (id: string, field: 'commissionPercent' | 'disbursementDays', value: number) => {
    setEditableGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: Math.max(0, value) } : g))
    );
  };

  const handleSaveAllGateways = async () => {
    setIsSavingGateways(true);
    try {
      await saveMethods(editableGateways);
      showToast('¡Tarifas de pasarelas guardadas exitosamente!');
    } catch (e) {
      console.error('Error saving gateways:', e);
      showToast('Error al guardar tarifas');
    } finally {
      setIsSavingGateways(false);
    }
  };

  const handleResetGateways = async () => {
    if (!window.confirm('¿Restablecer las tarifas a los valores estándar de Addi, Sistecrédito y Tarjetas?')) return;
    setIsSavingGateways(true);
    try {
      await resetToDefaults();
      showToast('Valores recomendados restablecidos');
    } catch (e) {
      console.error('Error resetting gateways:', e);
      showToast('Error al restablecer');
    } finally {
      setIsSavingGateways(false);
    }
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    try {
      await addCustomMethod({
        name: customName.trim(),
        commissionPercent: parseFloat(customRate) || 0,
        disbursementDays: parseInt(customDays, 10) || 0,
        isCreditGateway: true,
        badgeColor: 'blue',
        description: `Pasarela personalizada ${customName.trim()}`,
      });
      setCustomName('');
      setCustomRate('');
      setCustomDays('');
      setShowAddCustomGateway(false);
      showToast(`Pasarela "${customName.trim()}" agregada con éxito`);
    } catch (err) {
      console.error(err);
      showToast('Error al agregar pasarela');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 pb-28">
      {/* Toast Notification */}
      <AnimatePresence>
        {gatewayToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-full shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{gatewayToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Ajustes</h2>
        <p className="text-slate-500 font-medium mt-1">
          Configura tus espacios de trabajo, pasarelas de crédito y variables maestras
        </p>
      </div>

      {/* 1. Panel de Pasarelas de Pago y Comisiones (ERP SofiLu) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="text-blue-600" size={24} />
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Pasarelas de Pago y Comisiones
              </h3>
            </div>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
              Configura comisiones y días de desembolso para Addi, Sistecrédito y Tarjetas. El sistema calculará tu liquidez real automáticamente.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetGateways}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5"
              title="Restablecer tarifas recomendadas"
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Recomendados</span>
            </button>
            <button
              type="button"
              disabled={isSavingGateways}
              onClick={handleSaveAllGateways}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingGateways ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              <span>Guardar Tarifas</span>
            </button>
          </div>
        </div>

        {/* Gateways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editableGateways.map((gw) => {
            const isContado = gw.id === 'contado';
            const isApartado = gw.id === 'apartado';
            const isCredit = gw.isCreditGateway;

            // Example calculation on $100.000 COP
            const sampleGross = 100000;
            const sampleComm = Math.round(sampleGross * ((gw.commissionPercent || 0) / 100));
            const sampleNet = sampleGross - sampleComm;

            return (
              <div
                key={gw.id}
                className="bg-slate-50/70 border border-slate-200/70 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors relative"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isApartado
                          ? 'bg-amber-100 text-amber-600'
                          : isContado
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isApartado ? (
                        <Package size={20} />
                      ) : isContado ? (
                        <Wallet size={20} />
                      ) : (
                        <CreditCard size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{gw.name}</h4>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {isContado
                          ? '100% Inmediato a cuenta'
                          : isApartado
                          ? 'Abonos y reserva de productos'
                          : `Desembolso a ${gw.disbursementDays} días`}
                      </p>
                    </div>
                  </div>

                  {gw.isCustom && (
                    <button
                      type="button"
                      onClick={() => deleteMethod(gw.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      title="Eliminar pasarela personalizada"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      % Comisión
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={isContado || isApartado}
                        value={gw.commissionPercent}
                        onChange={(e) =>
                          handleGatewayChange(gw.id, 'commissionPercent', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100/70 disabled:text-slate-400 transition-all"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Días Desembolso
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        disabled={isContado || isApartado}
                        value={gw.disbursementDays}
                        onChange={(e) =>
                          handleGatewayChange(gw.id, 'disbursementDays', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100/70 disabled:text-slate-400 transition-all"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                        días
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time Dynamic Preview Pill */}
                <div className="bg-white/90 border border-slate-200/60 rounded-xl p-2.5 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                  <span>
                    {isContado
                      ? 'Entra el 100% de inmediato a tu caja.'
                      : isApartado
                      ? 'Registra abonos en caja real.'
                      : `En $100.000: Comisión -$${sampleComm.toLocaleString()}`}
                  </span>
                  {isCredit && (
                    <span className="text-emerald-600 font-black">
                      Recibes: ${sampleNet.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Gateway Button & Drawer */}
        <div className="pt-2">
          {!showAddCustomGateway ? (
            <button
              type="button"
              onClick={() => setShowAddCustomGateway(true)}
              className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 p-1 transition-colors"
            >
              <Plus size={15} /> Agregar otra pasarela personalizada (ej. Bold, Wompi, PayU)
            </button>
          ) : (
            <form
              onSubmit={handleAddCustom}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Nueva Pasarela de Crédito
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddCustomGateway(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Datáfono Bold"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    % Comisión
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ej. 2.99"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Días para desembolso
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej. 1"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Agregar Pasarela
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* 2. Espacios (Perfiles) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-extrabold text-slate-800">Espacios (Perfiles)</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-slate-900 transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} /> Crear Espacio
          </button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddProfile}
              className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-200 mb-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Startup 2024"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                    Tipo
                  </label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-semibold text-slate-800 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Business">Negocio</option>
                    <option value="Project">Proyecto</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-70"
                >
                  Guardar
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {profiles.map((p) => (
            <motion.div
              layout
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-3xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group gap-4 relative"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-4 rounded-[1.2rem] ${
                    p.id === currentProfile?.id
                      ? 'bg-blue-100 text-blue-600 shadow-sm shadow-blue-500/10'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {p.type === 'Business' ? <Briefcase size={24} /> : <UserIcon size={24} />}
                </div>
                {editingId === p.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800"
                    onKeyDown={(e) => e.key === 'Enter' && handleEditProfile(p.id)}
                  />
                ) : (
                  <div>
                    <p className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      {p.name}{' '}
                      {p.id === currentProfile?.id && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Activo
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">{p.type}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {editingId === p.id ? (
                  <>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => handleEditProfile(p.id)}
                      disabled={loading}
                      className="p-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-sm"
                    >
                      <Check size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setEditName(p.name);
                      }}
                      className="p-2.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(p.id)}
                      disabled={profiles.length === 1}
                      className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-30"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 3. Category Manager */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[2rem] p-6 md:p-8 shadow-[0_4px_30px_rgb(0,0,0,0.03)] border border-slate-100"
      >
        <div className="mb-6">
          <h3 className="text-xl font-extrabold text-slate-800">Mis Categorías</h3>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Gestiona las etiquetas (ej. Comida, Peluches) para tu espacio{' '}
            <b className="text-slate-700">"{currentProfile?.name}"</b>
          </p>
        </div>

        <form onSubmit={handleCreateCategory} className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-[2]">
            <Tag size={18} className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nueva categoría..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-slate-800"
            />
          </div>
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
          >
            <option value="gasto">Gasto / Salida</option>
            <option value="ingreso">Ingreso / Venta</option>
            <option value="general">Mixto (General)</option>
          </select>
          <button
            type="submit"
            disabled={loading || !newCatName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl transition-all disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
          >
            Agregar
          </button>
        </form>

        {categories.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-8 text-center">
            <Tag size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">No hay categorías configuradas.</p>
            <p className="text-slate-400 text-sm mt-1">Agrega la primera para empezar a clasificar tus finanzas.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {categories.map((cat) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group flex items-center gap-2 bg-slate-50 border border-slate-200 pl-4 pr-1.5 py-1.5 rounded-full"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      !cat.type || cat.type === 'general'
                        ? 'bg-slate-400'
                        : cat.type === 'ingreso'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
