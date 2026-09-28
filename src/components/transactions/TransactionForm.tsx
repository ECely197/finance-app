import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { createTransaction, getCategories, getInvestments, createSeparado } from '../../lib/firestore';
import { uploadSeparadoImage } from '../../lib/storage';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  CheckCircle2,
  DollarSign,
  Calendar,
  Link2,
  Briefcase,
  User as UserIcon,
  Check,
  Image as ImageIcon,
  Clock,
  Sparkles,
  CreditCard,
  Edit2,
  Wallet,
  Package,
  ShieldCheck,
  Hourglass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';

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
  const { methods, calculatePaymentBreakdown } = usePaymentMethods();

  // Form states
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfile?.id || '');
  const [type, setType] = useState('ingreso');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [inversionIdRelacionada, setInversionIdRelacionada] = useState('');

  // Payment method & Gateway states (for Ingreso)
  const [paymentMethod, setPaymentMethod] = useState('contado');
  const [customCommissionRate, setCustomCommissionRate] = useState<string>('');
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [disbursementStatus, setDisbursementStatus] = useState<'desembolsado' | 'pendiente'>('desembolsado');

  // Separados states
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
          txSnap.docs.forEach((d) => {
            const t = d.data();
            if (t.categoryId) freq[t.categoryId] = (freq[t.categoryId] || 0) + 1;
          });
          cats.sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
        } catch (e) {
          console.error('Error sorting categories', e);
        }

        setCategories(cats);
        if (!cats.find((c) => c.id === categoryId)) setCategoryId('');
        setInvestments(invs);
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    };

    loadMetadata();
  }, [user, selectedProfileId]);

  // When payment method changes, update rate and disbursement status default
  const activeMethodConfig = useMemo(() => {
    return methods.find((m) => m.id === paymentMethod) || methods[0];
  }, [methods, paymentMethod]);

  useEffect(() => {
    if (activeMethodConfig) {
      setCustomCommissionRate(activeMethodConfig.commissionPercent.toString());
      setIsEditingRate(false);
      if (activeMethodConfig.isCreditGateway && activeMethodConfig.disbursementDays > 0) {
        setDisbursementStatus('pendiente');
      } else {
        setDisbursementStatus('desembolsado');
      }
    }
  }, [activeMethodConfig]);

  const filteredCategories = categories.filter((c) => {
    if (!c.type || c.type === 'general') return true;
    if (type === 'ingreso' || type === 'inversion') return c.type === 'ingreso';
    return c.type === 'gasto';
  });

  const activeProfile = profiles.find((p) => p.id === selectedProfileId);
  const showInvestmentLink = type === 'ingreso' && activeProfile?.type === 'Business';
  const isSeparado = type === 'ingreso' && paymentMethod === 'apartado';
  const isCreditGateway = type === 'ingreso' && Boolean(activeMethodConfig?.isCreditGateway);

  // Calculations for Gateway
  const grossNum = parseFloat(amount) || 0;
  const activeRateNum = customCommissionRate !== '' ? parseFloat(customCommissionRate) || 0 : activeMethodConfig?.commissionPercent || 0;
  
  const gatewayBreakdown = useMemo(() => {
    const saleDate = new Date(date + 'T12:00:00');
    return calculatePaymentBreakdown(
      grossNum,
      activeRateNum,
      activeMethodConfig?.disbursementDays || 0,
      saleDate
    );
  }, [grossNum, activeRateNum, activeMethodConfig, date, calculatePaymentBreakdown]);

  // Separado pending balance calculation
  const valorTotalNum = parseFloat(valorTotal) || 0;
  const abonoInicialNum = grossNum;
  const saldoPendienteSeparado = Math.max(0, valorTotalNum - abonoInicialNum);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatEstimatedDate = (d: Date) => {
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
      let nuevoSeparadoId: string | undefined = undefined;

      // 1. Separados Logic
      if (type === 'ingreso' && isSeparado) {
        if (!valorTotal || Number(valorTotal) <= 0) {
          setToastMessage('Error: Valor Total inválido para el apartado');
          setTimeout(() => setToastMessage(''), 4000);
          setLoading(false);
          return;
        }

        let fotoUrl = '';
        if (fotoProd) {
          fotoUrl = await uploadSeparadoImage(user.uid, selectedProfileId, fotoProd);
        }

        const now = new Date();
        nuevoSeparadoId = await createSeparado(user.uid, selectedProfileId, {
          fotoUrl,
          valorTotal: Number(valorTotal),
          totalAbonado: parseFloat(amount),
          cliente: description.trim() || 'Apartado sin descripción',
          estado: parseFloat(amount) >= Number(valorTotal) ? 'completado' : 'pendiente',
          createdAt: now,
          initialPaymentMethod: 'apartado',
          abonos: [
            {
              id: txId,
              amount: parseFloat(amount),
              date: now,
              paymentMethod: 'apartado (abono inicial)',
              note: 'Abono inicial en caja',
              transactionId: txId,
            },
          ],
        });
      }

      const selectedDate = new Date(date + 'T00:00:00');
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      // Prepare transaction data according to ERP standards
      let finalAmount = parseFloat(amount);
      const txPayload: any = {
        amount: finalAmount,
        type: type as any,
        date: selectedDate,
        categoryId,
        description: description.trim(),
        createdAt: now,
        ...(showInvestmentLink && inversionIdRelacionada ? { inversionIdRelacionada } : {}),
      };

      if (type === 'ingreso') {
        txPayload.paymentMethod = paymentMethod;

        if (isSeparado) {
          txPayload.separadoId = nuevoSeparadoId;
          txPayload.grossAmount = Number(valorTotal);
          txPayload.netAmount = parseFloat(amount);
          txPayload.disbursementStatus = 'desembolsado';
        } else if (isCreditGateway) {
          txPayload.grossAmount = gatewayBreakdown.grossAmount;
          txPayload.netAmount = gatewayBreakdown.netAmount;
          txPayload.commissionRate = gatewayBreakdown.commissionPercent;
          txPayload.commissionAmount = gatewayBreakdown.commissionAmount;
          txPayload.disbursementDays = gatewayBreakdown.disbursementDays;
          txPayload.estimatedDisbursementDate = gatewayBreakdown.estimatedDisbursementDate;
          txPayload.disbursementStatus = disbursementStatus;
          // Set amount to the real net cash entering Sofilu's account
          txPayload.amount = gatewayBreakdown.netAmount;
        } else {
          // Contado / Transferencia
          txPayload.grossAmount = parseFloat(amount);
          txPayload.netAmount = parseFloat(amount);
          txPayload.commissionRate = 0;
          txPayload.commissionAmount = 0;
          txPayload.disbursementDays = 0;
          txPayload.disbursementStatus = 'desembolsado';
        }
      }

      await createTransaction(user.uid, selectedProfileId, txId, txPayload);

      // Reset form fields
      setAmount('');
      setCategoryId('');
      setDescription('');
      setValorTotal('');
      setFotoProd(null);
      setCustomCommissionRate('');
      setIsEditingRate(false);

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center rounded-[2.5rem]"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(16,185,129,0.3)] text-white mb-6"
            >
              <Check size={48} strokeWidth={3} />
            </motion.div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">¡Bóveda Actualizada!</h3>
            <p className="text-slate-500 font-bold mt-2">Movimiento y pasarelas sincronizados con éxito</p>
          </motion.div>
        )}

        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] ${
              toastMessage.includes('Debes') || toastMessage.includes('Error') ? 'bg-rose-600' : 'bg-slate-800'
            } text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm`}
          >
            {!toastMessage.includes('Debes') && !toastMessage.includes('Error') && (
              <CheckCircle2 size={20} className="text-emerald-400" />
            )}
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-6 pb-32 custom-scrollbar space-y-7">
          {/* 1. Selector de Espacio */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Espacio de Trabajo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                    selectedProfileId === p.id
                      ? 'border-blue-500 bg-blue-50/30 text-blue-700 shadow-sm'
                      : 'border-slate-50 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.type === 'Business' ? <Briefcase size={17} /> : <UserIcon size={17} />}
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tipo de Movimiento */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              Tipo de Movimiento
            </label>
            <div className="flex flex-wrap gap-2">
              {transactionTypes.map((t) => {
                const isActive = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex-1 min-w-[120px] sm:min-w-[100px] py-2.5 px-3.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 border-2 ${
                      isActive
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

          {/* 3. Selector de Modalidad de Venta (Solo cuando es INGRESO) */}
          <AnimatePresence>
            {type === 'ingreso' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Modalidad de Venta / Pasarela
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Cálculo de comisiones y liquidez</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {methods.map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <motion.button
                        key={method.id}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-sm ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                            : 'bg-slate-50/70 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        {method.id === 'apartado' ? (
                          <Package size={15} className={isSelected ? 'text-amber-300' : 'text-amber-500'} />
                        ) : method.isCreditGateway ? (
                          <CreditCard size={15} className={isSelected ? 'text-blue-300' : 'text-blue-500'} />
                        ) : (
                          <Wallet size={15} className={isSelected ? 'text-emerald-300' : 'text-emerald-500'} />
                        )}
                        <span>{method.name}</span>
                        {method.isCreditGateway && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-tight ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                            }`}
                          >
                            {method.commissionPercent}% • {method.disbursementDays}d
                          </span>
                        )}
                        {method.id === 'apartado' && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-tight ${
                              isSelected ? 'bg-amber-400/20 text-amber-200' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            Abono
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Monto Principal */}
          <div className="space-y-4">
            <div className="bg-white rounded-[2.2rem] border border-slate-100 p-8 shadow-sm">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                {isSeparado
                  ? 'Abono Inicial (Monto en Caja Real)'
                  : isCreditGateway
                  ? 'Valor Bruto de Venta'
                  : 'Monto Principal'}
              </label>
              <div className="flex items-center gap-5 pr-2">
                <div
                  className={`w-16 h-16 rounded-[1.4rem] flex items-center justify-center shrink-0 shadow-inner ${
                    isSeparado
                      ? 'bg-amber-50 text-amber-500'
                      : isCreditGateway
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <DollarSign size={32} strokeWidth={2.5} />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  value={amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-4xl sm:text-5xl font-black text-slate-800 placeholder:text-slate-100 outline-none tracking-tight"
                />
              </div>
            </div>

            {/* REAL-TIME GATEWAY SUMMARY CARD (Addi / Sistecrédito / Tarjeta) */}
            <AnimatePresence>
              {isCreditGateway && grossNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-[2.2rem] p-6 space-y-5 shadow-sm"
                >
                  {/* Top: Summary header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                      <Sparkles size={16} className="text-blue-500" />
                      <span>Liquidación Proyectada ({activeMethodConfig?.name})</span>
                    </div>
                    {/* Editable % trigger */}
                    {!isEditingRate ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingRate(true)}
                        className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Edit2 size={11} />
                        Editar % ({activeRateNum}%)
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">Tarifa especial:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={customCommissionRate}
                          onChange={(e) => setCustomCommissionRate(e.target.value)}
                          className="w-14 px-2 py-1 bg-white border border-blue-400 rounded-md text-xs font-bold text-blue-700 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingRate(false)}
                          className="text-[10px] bg-blue-600 text-white font-bold px-2 py-1 rounded-md"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Valor Bruto Venta
                      </span>
                      <span className="text-lg font-black text-slate-800 mt-1 block">
                        {formatCurrency(gatewayBreakdown.grossAmount)}
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-rose-500">
                        Comisión Pasarela ({gatewayBreakdown.commissionPercent}%)
                      </span>
                      <span className="text-lg font-black text-rose-500 mt-1 block">
                        -{formatCurrency(gatewayBreakdown.commissionAmount)}
                      </span>
                    </div>

                    <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-md shadow-emerald-500/20">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-100">
                        Neto Real a Recibir
                      </span>
                      <span className="text-xl font-black mt-1 block tracking-tight">
                        {formatCurrency(gatewayBreakdown.netAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Estimated Disbursement Date & Status Pill */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-500 shrink-0" />
                      <span className="font-extrabold text-slate-700">
                        Recibes el pago{' '}
                        {gatewayBreakdown.disbursementDays === 0
                          ? 'hoy mismo'
                          : `en ${gatewayBreakdown.disbursementDays} días`}
                        :
                      </span>
                      <span className="bg-blue-100/70 text-blue-700 px-2.5 py-1 rounded-full font-black text-[11px]">
                        {formatEstimatedDate(gatewayBreakdown.estimatedDisbursementDate)}
                      </span>
                    </div>

                    {/* Disbursement Status selector */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setDisbursementStatus('pendiente')}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          disbursementStatus === 'pendiente'
                            ? 'bg-amber-100 text-amber-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Hourglass size={12} />
                        Pendiente
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisbursementStatus('desembolsado')}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          disbursementStatus === 'desembolsado'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <ShieldCheck size={12} />
                        Desembolsado
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SEPARADO FORM DETAILS */}
            <AnimatePresence>
              {isSeparado && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-amber-50/40 border border-amber-200/70 rounded-[2.2rem] p-7 space-y-6"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200/50">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-amber-600" />
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">Detalles de Reserva / Apartado</h4>
                    </div>
                    {valorTotalNum > 0 && (
                      <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                        Saldo Pendiente: {formatCurrency(saldoPendienteSeparado)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3">
                      Valor Total de la Venta ($)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-amber-500">
                        <DollarSign size={20} />
                      </div>
                      <input
                        type="number"
                        required={isSeparado}
                        value={valorTotal}
                        onChange={(e) => setValorTotal(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-amber-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-black text-slate-800 text-xl shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                      Foto del Producto (Opcional)
                    </label>
                    <label className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-slate-400 hover:text-amber-700 rounded-[1.5rem] py-4 px-6 transition-all cursor-pointer shadow-sm">
                      <ImageIcon size={22} />
                      <span className="font-bold text-sm truncate">{fotoProd ? fotoProd.name : 'Subir Foto de Prenda/Producto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFotoProd(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Categorías */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoría</label>
            {filteredCategories.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
                <p className="text-slate-400 font-bold mb-4 text-sm">No hay categorías configuradas.</p>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="bg-white border border-slate-200 text-slate-600 font-bold px-6 py-3 rounded-2xl hover:bg-slate-100 transition-all text-sm shadow-sm"
                >
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
                    className={`px-5 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.1em] transition-all border-2 ${
                      categoryId === cat.id
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

          {/* 6. Descripción & Fecha */}
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5">
                {isSeparado ? 'Cliente / Productos Apartados' : 'Descripción / Nota'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.8rem] focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 resize-none text-sm placeholder:text-slate-300"
                placeholder={
                  isSeparado
                    ? 'Ej. María Pérez - Vestido Floreado Talla M'
                    : 'Ej. Venta de mercancía o factura de clientes...'
                }
              />
            </div>

            {showInvestmentLink && (
              <div className="pt-1">
                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2.5">
                  Vincular a Inversión previa (RSI)
                </label>
                <div className="relative">
                  <select
                    value={inversionIdRelacionada}
                    onChange={(e) => setInversionIdRelacionada(e.target.value)}
                    className="w-full pl-6 pr-12 py-4 bg-indigo-50/50 border border-indigo-100 rounded-[1.8rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 appearance-none cursor-pointer text-sm"
                  >
                    <option value="">Ingreso Independiente</option>
                    {investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        Inversión: ${inv.amount.toLocaleString()} - {inv.description || 'Capital'}
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
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 overflow-hidden"
                  >
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:outline-none font-bold text-slate-700 text-sm shadow-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-5 md:px-10 border-t border-slate-100 bg-white/90 backdrop-blur-xl flex gap-3">
          <button
            type="button"
            onClick={() => onComplete && onComplete()}
            className="flex-1 py-4 px-6 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-black uppercase tracking-[0.1em] rounded-[1.8rem] transition-all text-[11px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || profiles.length === 0}
            className="flex-[2] py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-full transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 text-[11px]"
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
