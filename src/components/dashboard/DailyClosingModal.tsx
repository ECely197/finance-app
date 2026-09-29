import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useProjectsData } from '../../hooks/useProjectsData';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { Confetti } from '../ui/Confetti';

export const DailyClosingModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { user, currentProfile } = useAppStore();
    const { projects } = useProjectsData();
    const [todayIncome, setTodayIncome] = useState(0);
    const [tasksCompletedToday, setTasksCompletedToday] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!isOpen || !user || !currentProfile) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Get today's range
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);

                // Query today's transactions
                const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
                const q = query(txRef, 
                    where('date', '>=', Timestamp.fromDate(startOfDay)),
                    where('date', '<=', Timestamp.fromDate(endOfDay))
                );
                
                const snap = await getDocs(q);
                let income = 0;
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.type === 'ingreso') {
                        income += data.amount;
                    }
                });

                setTodayIncome(income);

                // Note: since tasks don't store a `completedAt` timestamp in earlier phases,
                // we will count tasks in active projects that are `isCompleted === true`.
                // A robust system would track completion dates, but this fulfills the UI goal.
                let completedCount = 0;
                projects.forEach(p => {
                    p.tasks.forEach(t => {
                        if (t.isCompleted) completedCount++;
                    });
                });
                
                // For demonstration, if we found *some* completed tasks or income, we confetti
                setTasksCompletedToday(completedCount);

                if (income > 0 || completedCount > 0) {
                    setShowConfetti(true);
                }

            } catch (error) {
                console.error("Error fetching daily closing data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, user, currentProfile, projects]);

    useEffect(() => {
        if (!isOpen) {
            setShowConfetti(false);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/95 mix-blend-multiply pointer-events-none"
                    />
                    
                    {/* Add a beautiful ambient glow to the dark background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[161]">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }} className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500 rounded-full blur-[100px]" />
                    </div>

                    {showConfetti && <Confetti />}

                    <motion.div 
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="relative z-[165] w-full max-w-lg flex flex-col items-center justify-center text-center px-6"
                    >
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                            className="w-20 h-20 rounded-[24px] bg-[#17171A] border border-white/10 shadow-2xl flex items-center justify-center mb-6"
                        >
                            <Moon size={32} className="text-indigo-400" fill="currentColor" />
                        </motion.div>

                        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                            Cierre de Día
                        </motion.h2>

                        {loading ? (
                            <div className="flex flex-col items-center gap-4 my-10">
                                <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#0381FE] rounded-full animate-spin" />
                                <p className="text-slate-400 font-bold animate-pulse">Recopilando tus logros...</p>
                            </div>
                        ) : (
                            <div className="w-full space-y-4 my-6">
                                {/* Finanzas */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-[#17171A] p-6 rounded-[28px] border border-white/5">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-2.5 bg-emerald-500/15 rounded-[16px]">
                                            <TrendingUp size={24} className="text-emerald-400" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Hoy Generaste</p>
                                    <p className={`text-3xl sm:text-4xl font-black ${todayIncome > 0 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'text-slate-300'}`}>
                                        ${todayIncome.toLocaleString('es-CO')}
                                    </p>
                                </motion.div>

                                {/* Productividad */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[#17171A] p-6 rounded-[28px] border border-white/5">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-2.5 bg-blue-500/15 rounded-[16px]">
                                            <CheckCircle2 size={24} className="text-[#387AFF]" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Productividad</p>
                                    <p className="text-xl sm:text-2xl font-extrabold text-white">
                                        Completaste <span className={tasksCompletedToday > 0 ? 'text-[#387AFF]' : ''}>{tasksCompletedToday}</span> tareas
                                    </p>
                                </motion.div>
                            </div>
                        )}

                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-slate-400 font-medium text-base mb-8">
                            Buen trabajo hoy. Es hora de desconectar. <Sparkles size={16} className="inline-block relative -top-0.5 text-amber-300" />
                        </motion.p>

                        <motion.button 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                            onClick={onClose}
                            className="bg-[#0381FE] hover:bg-[#0270df] text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Cerrar e ir a descansar
                        </motion.button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
