import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit2,
  DollarSign,
  Plus,
  CheckCircle2,
  Package,
  Banknote,
  Sparkles,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { updateSeparado, deleteSeparado, addAbonoToSeparado, liquidateSeparado } from '../../lib/firestore';
import type { Separado } from '../../hooks/useSeparadosData';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { getTodayColombia, createColombiaDateTime, formatColombiaShort } from '../../utils/dateUtils';

interface EditApartadoModalProps {
  separado: Separado | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const EditApartadoModal: React.FC<EditApartadoModalProps> = ({
  separado,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user, currentProfile } = useAppStore();
  const { methods, calculatePaymentBreakdown } = usePaymentMethods();

  // Edit core details states
  const [valorTotal, setValorTotal] = useState('');
  const [cliente, setCliente] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // New abono states
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState('contado');
  const [abonoNote, setAbonoNote] = useState('');
  const [abonoDate, setAbonoDate] = useState(() => getTodayColombia());
  const [isSubmittingAbono, setIsSubmittingAbono] = useState(false);
  const [showAbonoForm, setShowAbonoForm] = useState(false);

  // Quick liquidation states
  const [showLiquidationCard, setShowLiquidationCard] = useState(false);
  const [liquidationMethod, setLiquidationMethod] = useState('contado');
  const [liquidationNote, setLiquidationNote] = useState('');
  const [isLiquidating, setIsLiquidating] = useState(false);

  // Feedback states
  const [toastMessage, setToastMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  useEffect(() => {
    if (separado) {
      setValorTotal(separado.valorTotal.toString());
      setCliente(separado.cliente || '');
      setShowAbonoForm(false);
      setShowLiquidationCard(false);
      setAbonoAmount('');
      setAbonoNote('');
      setLiquidationNote('');
    }
  }, [separado]);

  if (!isOpen || !separado) return null;

  const currentTotal = Number(valorTotal) || separado.valorTotal;
  const totalAbonado = separado.totalAbonado || 0;
  const saldoPendiente = Math.max(0, currentTotal - totalAbonado);
  const progressPercent = currentTotal > 0 ? Math.min(100, Math.max(0, (totalAbonado / currentTotal) * 100)) : 100;
  const isCompleted = separado.estado === 'completado' || saldoPendiente === 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 1. Guardar cambios en el Valor Total y Cliente / Descripción
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentProfile) return;

    const numTotal = Number(valorTotal);
    if (!numTotal || numTotal <= 0) {
      showToast('Ingresa un valor total válido');
      return;
    }
    if (numTotal < totalAbonado) {
      showToast('El valor total no puede ser menor al monto ya abonado');
      return;
    }

    setIsSavingDetails(true);
    try {
      const newStatus = totalAbonado >= numTotal ? 'completado' : 'pendiente';
      await updateSeparado(user.uid, currentProfile.id, separado.id, {
        valorTotal: numTotal,
        cliente: cliente.trim(),
        estado: newStatus,
      });
      showToast('Apartado actualizado correctamente');
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error updating separado details:', err);
      showToast('Error al actualizar el apartado');
    } finally {
      setIsSavingDetails(false);
    }
  };

  // 2. Registrar nuevo abono
  const handleAddAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentProfile) return;

    const amountNum = parseFloat(abonoAmount);
    if (!amountNum || amountNum <= 0) {
      showToast('Ingresa un monto de abono válido');
      return;
    }
    if (amountNum > saldoPendiente) {
      showToast(`El abono supera el saldo pendiente (${formatCurrency(saldoPendiente)})`);
      return;
    }

    setIsSubmittingAbono(true);
    try {
      const selectedDate = createColombiaDateTime(abonoDate);

      await addAbonoToSeparado(
        user.uid,
        currentProfile.id,
        separado.id,
        {
          cliente: cliente.trim() || separado.cliente,
          valorTotal: currentTotal,
          totalAbonado,
          abonos: separado.abonos || [],
        },
        {
          amount: amountNum,
          paymentMethod: abonoMethod,
          note: abonoNote.trim(),
          date: selectedDate,
        }
      );

      setAbonoAmount('');
      setAbonoNote('');
      setShowAbonoForm(false);
      showToast(`Abono de ${formatCurrency(amountNum)} registrado en caja`);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error adding abono:', err);
      showToast('Error al registrar el abono');
    } finally {
      setIsSubmittingAbono(false);
    }
  };

  // 3. Liquidar Apartado
  const handleLiquidate = async () => {
    if (!user || !currentProfile) return;
    if (saldoPendiente <= 0) {
      showToast('Este apartado ya está liquidado');
      return;
    }

    setIsLiquidating(true);
    try {
      const methodCfg = methods.find((m) => m.id === liquidationMethod);
      const isGateway = methodCfg?.isCreditGateway;
      const breakdown = calculatePaymentBreakdown(
        saldoPendiente,
        methodCfg?.commissionPercent || 0,
        methodCfg?.disbursementDays || 0
      );

      await liquidateSeparado(
        user.uid,
        currentProfile.id,
        {
          id: separado.id,
          cliente: cliente.trim() || separado.cliente,
          valorTotal: currentTotal,
          totalAbonado,
          abonos: separado.abonos || [],
        },
        {
          paymentMethod: liquidationMethod,
          note: liquidationNote.trim() || 'Pago total de excedente',
          grossAmount: saldoPendiente,
          netAmount: isGateway ? breakdown.netAmount : saldoPendiente,
          commissionRate: isGateway ? breakdown.commissionPercent : 0,
          commissionAmount: isGateway ? breakdown.commissionAmount : 0,
          disbursementDays: isGateway ? breakdown.disbursementDays : 0,
          estimatedDisbursementDate: isGateway ? breakdown.estimatedDisbursementDate : undefined,
          disbursementStatus: isGateway && breakdown.disbursementDays > 0 ? 'pendiente' : 'desembolsado',
        }
      );

      setSuccessAnimation(true);
      setTimeout(() => {
        setSuccessAnimation(false);
        if (onUpdated) onUpdated();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error liquidating separado:', err);
      showToast('Error al liquidar el apartado');
    } finally {
      setIsLiquidating(false);
    }
  };

  // 4. Eliminar Apartado
  const handleDelete = async () => {
    if (!user || !currentProfile) return;
    if (!window.confirm('¿Seguro que deseas eliminar este apartado? Las transacciones de abonos previas seguirán existiendo en tu historial.')) {
      return;
    }

    try {
      await deleteSeparado(user.uid, currentProfile.id, separado.id);
      showToast('Apartado eliminado');
      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error('Error deleting separado:', err);
      showToast('Error al eliminar');
    }
  };

  const activeLiquidationMethod = methods.find((m) => m.id === liquidationMethod);
  const liquidationBreakdown = calculatePaymentBreakdown(
    saldoPendiente,
    activeLiquidationMethod?.commissionPercent || 0,
    activeLiquidationMethod?.disbursementDays || 0
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Container (One UI 9.0 Bottom Sheet) */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="relative w-full max-w-2xl bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden border border-white/20 dark:border-white/5"
      >
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-black text-white font-bold text-xs py-3 px-6 rounded-full shadow-xl flex items-center gap-2 border border-white/10"
            >
              <AlertCircle size={15} className="text-amber-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Splash */}
        <AnimatePresence>
          {successAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/95 dark:bg-[#17171A]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={44} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">¡Apartado Liquidado al 100%!</h3>
              <p className="text-sm font-semibold text-slate-400 mt-2 max-w-xs">
                Se registró el ingreso final y el cliente ha completado el pago del producto.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Header */}
        <div className="px-6 sm:px-8 pt-2 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[20px] bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Package size={24} strokeWidth={2.3} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">
                  {separado.cliente || 'Apartado sin nombre'}
                </h3>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {isCompleted ? 'Liquidado' : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-0.5">Gestión de saldo, abonos y producto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6">
          {/* Card: Financial Status & Progress */}
          <div className="bg-slate-100/80 dark:bg-[#1C1C1E] border-none dark:border dark:border-white/5 rounded-[24px] p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Total Venta</span>
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 block">
                  {formatCurrency(currentTotal)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Abonado</span>
                <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 block">
                  {formatCurrency(totalAbonado)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-rose-500">Saldo Pendiente</span>
                <span className="text-lg sm:text-2xl font-black text-rose-500 tracking-tight mt-1 block">
                  {formatCurrency(saldoPendiente)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-400 mb-2">
                <span>Progreso de Pago</span>
                <span className="text-emerald-600 dark:text-emerald-400">{progressPercent.toFixed(0)}% cubierto</span>
              </div>
              <div className="w-full h-3 bg-slate-200/80 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Quick Action: Liquidar Apartado if pending */}
          {!isCompleted && saldoPendiente > 0 && (
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-[2rem] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                    <Sparkles size={16} />
                    <span>¿El cliente va a pagar el 100% hoy?</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Liquida el saldo restante de <b className="text-emerald-700">{formatCurrency(saldoPendiente)}</b> con un solo clic.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLiquidationCard(!showLiquidationCard)}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0"
                >
                  <CheckCircle2 size={16} />
                  Liquidar Apartado
                </button>
              </div>

              {/* Liquidation Options Drawer */}
              <AnimatePresence>
                {showLiquidationCard && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-5 mt-5 border-t border-emerald-500/20 space-y-4"
                  >
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-2">
                        ¿Con qué método paga el excedente ({formatCurrency(saldoPendiente)})?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {methods.filter((m) => m.id !== 'apartado').map((m) => {
                          const isSelected = liquidationMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setLiquidationMethod(m.id)}
                              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all border ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {m.name}
                              {m.isCreditGateway && ` (${m.commissionPercent}%)`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown for credit gateway if selected */}
                    {activeLiquidationMethod?.isCreditGateway && (
                      <div className="bg-white/80 border border-emerald-200/60 rounded-xl p-3 text-xs flex justify-between items-center font-bold text-slate-600">
                        <span>
                          Comisión pasarela ({liquidationBreakdown.commissionPercent}%):{' '}
                          <b className="text-rose-500">-{formatCurrency(liquidationBreakdown.commissionAmount)}</b>
                        </span>
                        <span className="text-emerald-600 font-extrabold">
                          Neto a recibir: {formatCurrency(liquidationBreakdown.netAmount)}
                        </span>
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        value={liquidationNote}
                        onChange={(e) => setLiquidationNote(e.target.value)}
                        placeholder="Nota o comprobante (ej. Voucher #3928, Nequi)..."
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLiquidationCard(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isLiquidating}
                        onClick={handleLiquidate}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLiquidating ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={15} /> Confirmar Liquidación
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section: Editar Datos Básicos (Valor Total & Cliente/Productos) */}
          <form onSubmit={handleSaveDetails} className="bg-slate-100/90 dark:bg-[#1C1C1E] border-none dark:border dark:border-white/5 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 size={16} className="text-[#0381FE]" />
                Modificar Datos del Apartado
              </h4>
              <span className="text-[11px] font-bold text-slate-400">Edita total o notas de producto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Valor Total de la Venta ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <DollarSign size={16} />
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border-none rounded-[18px] font-black text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-[#0381FE]/30 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Cliente / Productos Apartados
                </label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej. Juan Pérez - Tenis Nike Talla 42"
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-none rounded-[18px] font-bold text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0381FE]/30 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingDetails}
                className="px-6 py-2.5 bg-[#0381FE] hover:bg-[#0270df] text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
              >
                {isSavingDetails ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>

          {/* Section: Registrar Nuevo Abono */}
          <div className="bg-slate-100/90 dark:bg-[#1C1C1E] border-none dark:border dark:border-white/5 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote size={17} className="text-emerald-600 dark:text-emerald-400" />
                  Abonos Parciales
                </h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  Cada abono suma al flujo de caja real del día en que se registra.
                </p>
              </div>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => setShowAbonoForm(!showAbonoForm)}
                  className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-full transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Plus size={15} />
                  {showAbonoForm ? 'Cerrar' : 'Nuevo Abono'}
                </button>
              )}
            </div>

            {/* Abono Form */}
            <AnimatePresence>
              {showAbonoForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddAbono}
                  className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-[20px] p-5 space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-2">
                        Monto a Abonar ($)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500">
                          <DollarSign size={16} />
                        </div>
                        <input
                          type="number"
                          autoFocus
                          inputMode="decimal"
                          required
                          max={saldoPendiente}
                          value={abonoAmount}
                          onChange={(e) => setAbonoAmount(e.target.value)}
                          placeholder={`Máximo ${formatCurrency(saldoPendiente)}`}
                          className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-800 border-none rounded-[16px] font-black text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Fecha del Abono
                      </label>
                      <input
                        type="date"
                        required
                        value={abonoDate}
                        onChange={(e) => setAbonoDate(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-none rounded-[16px] font-bold text-slate-900 dark:text-white text-sm focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Método de Pago del Abono
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {methods.filter((m) => m.id !== 'apartado').map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAbonoMethod(m.id)}
                          className={`px-3.5 py-2 rounded-full font-black text-xs transition-all border ${
                            abonoMethod === m.id
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white dark:bg-zinc-800 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={abonoNote}
                      onChange={(e) => setAbonoNote(e.target.value)}
                      placeholder="Nota opcional (ej. Transferencia Bancolombia, Abono 2)..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border-none rounded-[16px] text-xs font-bold text-slate-900 dark:text-white outline-none shadow-sm placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAbonoForm(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAbono}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-full transition-all shadow-md shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
                    >
                      {isSubmittingAbono ? 'Registrando...' : 'Registrar Abono (+)'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List of Abonos */}
            {separado.abonos && separado.abonos.length > 0 ? (
              <div className="divide-y divide-slate-200/50 dark:divide-white/5 border border-slate-200/40 dark:border-white/5 rounded-[20px] overflow-hidden">
                {separado.abonos.map((ab, idx) => (
                  <div key={ab.id || idx} className="p-3.5 flex items-center justify-between bg-white dark:bg-[#252528] hover:bg-slate-50 dark:hover:bg-[#2d2d31] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(ab.amount)}{' '}
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                            • {ab.paymentMethod || 'Contado'}
                          </span>
                        </p>
                        {ab.note && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{ab.note}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {ab.date ? formatColombiaShort(ab.date) : 'Reciente'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#252528] border border-dashed border-slate-200 dark:border-white/10 rounded-[20px] p-4 text-center">
                <p className="text-xs font-bold text-slate-400">
                  Abono inicial registrado: <b className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAbonado)}</b>
                </p>
              </div>
            )}
          </div>

          {/* Delete action */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={handleDelete}
              className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1.5 transition-colors p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 size={15} /> Eliminar Apartado
            </button>
            <p className="text-[11px] font-bold text-slate-400">ID: {separado.id.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-4 bg-slate-100 dark:bg-zinc-800/80 border-t border-slate-100 dark:border-white/5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 dark:bg-black hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all shadow-sm active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
