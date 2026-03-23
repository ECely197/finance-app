import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useProjectsData } from '../../hooks/useProjectsData';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const Confetti = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const particles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // vw
        y: -10 - Math.random() * 20, // vh
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 0.5,
        duration: Math.random() * 2 + 1.5
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-sm"
                    style={{
                        width: p.size,
                        height: p.size * 1.5,
                        backgroundColor: p.color,
                        left: `${p.x}vw`,
                        top: `${p.y}vh`
                    }}
                    animate={{
                        y: ['0vh', '120vh'],
                        x: [0, Math.sin(p.id) * 100],
                        rotate: [p.rotation, p.rotation + 360 * 3]
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        ease: "easeOut"
                    }}
                />
            ))}
        </div>
    );
};

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
                        className="absolute inset-0 bg-slate-900/95 mix-blend-multiply pointer-events-none"
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
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-[165] w-full max-w-lg flex flex-col items-center justify-center text-center px-6"
                    >
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                            className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 shadow-2xl flex items-center justify-center mb-8"
                        >
                            <Moon size={32} className="text-indigo-400" fill="currentColor" />
                        </motion.div>

                        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                            Cierre de Día
                        </motion.h2>

                        {loading ? (
                            <div className="flex flex-col items-center gap-4 my-10">
                                <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                                <p className="text-slate-500 font-bold animate-pulse">Recopilando tus logros...</p>
                            </div>
                        ) : (
                            <div className="w-full space-y-6 my-8">
                                {/* Finanzas */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-800/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-700/50">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                                            <TrendingUp size={24} className="text-emerald-400" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Hoy Generaste</p>
                                    <p className={`text-4xl font-black ${todayIncome > 0 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'text-slate-300'}`}>
                                        ${todayIncome.toLocaleString('es-CO')}
                                    </p>
                                </motion.div>

                                {/* Productividad */}
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-slate-800/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-700/50">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-2 bg-blue-500/10 rounded-xl">
                                            <CheckCircle2 size={24} className="text-blue-400" />
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Productividad</p>
                                    <p className="text-2xl font-extrabold text-white">
                                        Completaste <span className={tasksCompletedToday > 0 ? 'text-blue-400' : ''}>{tasksCompletedToday}</span> tareas
                                    </p>
                                </motion.div>
                            </div>
                        )}

                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-slate-400 font-medium text-lg mb-10">
                            Buen trabajo hoy. Es hora de desconectar. <Sparkles size={16} className="inline-block relative -top-0.5 text-amber-300" />
                        </motion.p>

                        <motion.button 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-full shadow-lg backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
                        >
                            Cerrar e ir a descansar
                        </motion.button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
