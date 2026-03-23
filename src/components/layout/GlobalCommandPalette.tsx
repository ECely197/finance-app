import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, CheckCircle2, AlertCircle, FileText, CheckSquare, DollarSign, Activity } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { createTransaction, getCategories, createTask, createNote } from '../../lib/firestore';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useProjectsData } from '../../hooks/useProjectsData';

export const GlobalCommandPalette = () => {
    const { user, currentProfile } = useAppStore();
    const { projects } = useProjectsData();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const optionsRef = useRef<HTMLDivElement>(null);

    // Global Key Listener for Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Load recent transactions for search
    useEffect(() => {
        if (isOpen && user && currentProfile) {
            const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
            getDocs(query(txRef, orderBy('date', 'desc'), limit(100))).then(snap => {
                setRecentTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
        }
    }, [isOpen, user, currentProfile]);

    useEffect(() => {
        setSelectedIndex(0);
        if (status === 'error') setStatus('idle');
    }, [inputValue]);

    const executeDirectOption = (option: any) => {
        if (option.type === 'command') {
            setInputValue(option.prefix + ' ');
            inputRef.current?.focus();
        } else {
            // It's a search result (transaction or task)
            setIsOpen(false);
        }
    };

    const processCommand = async (textToProcess: string = inputValue) => {
        if (!textToProcess.trim() || !user || !currentProfile) return;
        
        setStatus('processing');
        const text = textToProcess.trim();
        
        try {
            if (text.startsWith('/gasto')) {
                // regex: /gasto 50000 papeleria
                const parts = text.split(' ').filter(Boolean);
                if (parts.length < 3) throw new Error("Formato: /gasto [monto] [descripción]");
                
                const amount = parseFloat(parts[1]);
                if (isNaN(amount)) throw new Error("El monto no es válido");
                const description = parts.slice(2).join(' ');

                // Category binding (Fallback to first available expense category)
                const cats = await getCategories(user.uid, currentProfile.id);
                const expenseCats = cats.filter((c: any) => c.type === 'gasto' || c.type === 'general');
                if (expenseCats.length === 0) throw new Error("No hay categorías de gasto creadas en este perfil");
                
                const categoryId = expenseCats[0].id; // For simplicity, grab first. A robust NLP would match strings.
                const txId = crypto.randomUUID();

                await createTransaction(user.uid, currentProfile.id, txId, {
                    amount,
                    type: 'gasto_variable',
                    date: new Date(),
                    categoryId,
                    description,
                });

                setFeedbackMsg(`Gasto de $${amount} registrado.`);

            } else if (text.startsWith('/ingreso')) {
                const parts = text.split(' ').filter(Boolean);
                if (parts.length < 3) throw new Error("Formato: /ingreso [monto] [descripción]");
                
                const amount = parseFloat(parts[1]);
                if (isNaN(amount)) throw new Error("El monto no es válido");
                const description = parts.slice(2).join(' ');

                const cats = await getCategories(user.uid, currentProfile.id);
                const incomeCats = cats.filter((c: any) => c.type === 'ingreso' || c.type === 'general');
                if (incomeCats.length === 0) throw new Error("No hay categorías de ingreso creadas");
                const categoryId = incomeCats[0].id;

                await createTransaction(user.uid, currentProfile.id, crypto.randomUUID(), {
                    amount, type: 'ingreso', date: new Date(), categoryId, description
                });
                setFeedbackMsg(`Ingreso de $${amount} registrado.`);

            } else if (text.startsWith('/tarea')) {
                // regex: /tarea Leer capitulo 4
                const content = text.replace('/tarea', '').trim();
                if (!content) throw new Error("Formato: /tarea [descripción]");

                const activeProjects = projects.filter(p => p.progress < 100);
                if (activeProjects.length === 0) throw new Error("No hay proyectos activos para añadir la tarea");

                const topProjectId = activeProjects[0].id as string;
                await createTask(user.uid, currentProfile.id, topProjectId, {
                    titulo: content,
                    isCompleted: false,
                    createdAt: new Date()
                });

                setFeedbackMsg(`Tarea añadida a: ${activeProjects[0].titulo}`);

            } else if (text.startsWith('/nota')) {
                // regex: /nota Idea para ancheta
                const content = text.replace('/nota', '').trim();
                if (!content) throw new Error("Formato: /nota [contenido]");

                await createNote(user.uid, currentProfile.id, {
                    content,
                    createdAt: new Date()
                });

                setFeedbackMsg(`Nota guardada en el "Segundo Cerebro"`);

            } else {
                throw new Error("Comando no reconocido. Usa /gasto, /tarea o /nota");
            }

            setStatus('success');
            setTimeout(() => setIsOpen(false), 2000);

        } catch (err: any) {
            setStatus('error');
            setFeedbackMsg(err.message || "Ocurrió un error al procesar el comando.");
        }
    };

    // Calculate currently visible options
    const defaultCommands = [
        { id: 'cmd-gasto', type: 'command', title: 'Registrar un gasto', subtitle: 'Añade un egreso rápido', prefix: '/gasto', icon: 'gasto' },
        { id: 'cmd-ingreso', type: 'command', title: 'Registrar un ingreso', subtitle: 'Añade una venta o entrada', prefix: '/ingreso', icon: 'ingreso' },
        { id: 'cmd-tarea', type: 'command', title: 'Añadir tarea', subtitle: 'Añadir al proyecto activo', prefix: '/tarea', icon: 'tarea' },
        { id: 'cmd-nota', type: 'command', title: 'Guardar nota', subtitle: 'Enviar al Segundo Cerebro', prefix: '/nota', icon: 'nota' },
    ];

    let options: any[] = [];
    const lowerInput = inputValue.trim().toLowerCase();
    
    if (!lowerInput || lowerInput.startsWith('/')) {
        options = defaultCommands.filter(c => c.prefix.startsWith(lowerInput.split(' ')[0]));
    } else {
        // Search mode
        projects.forEach(p => {
            p.tasks.forEach(t => {
                if (t.titulo.toLowerCase().includes(lowerInput)) {
                    options.push({ id: t.id, type: 'search-task', title: t.titulo, subtitle: `Proyecto: ${p.titulo}`, icon: 'search-task' });
                }
            });
        });
        recentTransactions.forEach(tx => {
            if ((tx.description || '').toLowerCase().includes(lowerInput) || tx.amount.toString().includes(lowerInput)) {
                options.push({ id: tx.id, type: 'search-tx', title: tx.description || 'Movimiento', subtitle: `${tx.type === 'ingreso' ? '+' : '-'}$${tx.amount.toLocaleString()}`, icon: tx.type });
            }
        });
        // Limit search results
        options = options.slice(0, 8);
    }

    // Scroll active item into view
    useEffect(() => {
        if (optionsRef.current && isOpen) {
            const activeEl = optionsRef.current.children[selectedIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isOpen, options.length]);

    const handleKeyDownInInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.startsWith('/') && inputValue.trim().includes(' ')) {
                // Execute command directly if it has arguments
                processCommand();
            } else if (options[selectedIndex]) {
                const opt = options[selectedIndex];
                if (opt.type === 'command') {
                   setInputValue(opt.prefix + ' ');
                } else {
                   executeDirectOption(opt);
                }
            } else if (inputValue.startsWith('/')) {
                processCommand();
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setIsOpen(false)} 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -20 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center px-6 py-5 border-b border-slate-100 relative">
                            {status === 'processing' ? (
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin shrink-0" />
                            ) : status === 'success' ? (
                                <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                            ) : status === 'error' ? (
                                <AlertCircle size={24} className="text-rose-500 shrink-0" />
                            ) : (
                                <Search size={24} className="text-slate-400 shrink-0" strokeWidth={2.5}/>
                            )}
                            
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDownInInput}
                                    disabled={status === 'processing' || status === 'success'}
                                    placeholder="Escribe un comando o busca algo..."
                                    className="w-full bg-transparent border-none outline-none text-xl md:text-2xl font-bold text-slate-700 px-4 placeholder:text-slate-300 disabled:opacity-50"
                                    autoComplete="off"
                                    spellCheck="false"
                                />

                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg shrink-0">
                                <Command size={14} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enter</span>
                            </div>
                        </div>

                        {status !== 'idle' && status !== 'processing' ? (
                            <div className={`px-6 py-5 flex items-center gap-3 font-semibold text-sm animate-in fade-in ${status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {status === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                                {feedbackMsg}
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {options.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-bold text-sm">
                                        No se encontraron resultados
                                    </div>
                                ) : (
                                    <div ref={optionsRef} className="space-y-1">
                                        {options.map((opt, idx) => {
                                            const isSelected = selectedIndex === idx;
                                            
                                            // Determine Icon
                                            let OptIcon = Command;
                                            let iconColor = 'text-slate-400';
                                            let iconBg = 'bg-slate-100';

                                            if (opt.icon === 'gasto' || opt.icon === 'gasto_variable' || opt.icon === 'gasto_fijo') { OptIcon = Activity; iconColor = 'text-blue-500'; iconBg = 'bg-blue-50'; }
                                            if (opt.icon === 'ingreso') { OptIcon = DollarSign; iconColor = 'text-emerald-500'; iconBg = 'bg-emerald-50'; }
                                            if (opt.icon === 'tarea' || opt.icon === 'search-task') { OptIcon = CheckSquare; iconColor = 'text-purple-500'; iconBg = 'bg-purple-50'; }
                                            if (opt.icon === 'nota') { OptIcon = FileText; iconColor = 'text-amber-500'; iconBg = 'bg-amber-50'; }

                                            return (
                                                <div 
                                                    key={opt.id}
                                                    onClick={() => executeDirectOption(opt)}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-200/60 scale-[1.01]' : 'border border-transparent hover:bg-slate-100/50'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
                                                            <OptIcon size={18} strokeWidth={2.5}/>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{opt.title}</span>
                                                                {opt.type === 'command' && <span className="font-mono text-[10px] font-black tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{opt.prefix}</span>}
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-400">{opt.subtitle}</span>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={16} className={`transition-all ${isSelected ? 'text-blue-500 opacity-100 translate-x-0' : 'text-slate-300 opacity-0 -translate-x-4'}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
