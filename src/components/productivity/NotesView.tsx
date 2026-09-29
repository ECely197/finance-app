import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useNotesData } from '../../hooks/useNotesData';
import { useAppStore } from '../../store/useAppStore';
import { useProjectsData } from '../../hooks/useProjectsData';
import { createNote, updateNote, deleteNote } from '../../lib/firestore';
import { uploadDocumentImage } from '../../lib/storage';
import { Plus, Search, Tags, Image as ImageIcon, FileText, Loader2, Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, X, Trash2, BookText, Link2, Unlink } from 'lucide-react';

const MenuBar = ({ editor, onImageUpload, isUploadingImage }: { editor: any, onImageUpload: (e: any) => void, isUploadingImage: boolean }) => {
    if (!editor) return null;
    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/80 dark:bg-[#1C1C1E]/80 border-b border-black/5 dark:border-white/5 rounded-t-[28px]">
            <button onClick={() => editor.chain().focus().toggleBold().run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Bold size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Italic size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('underline') ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <UnderlineIcon size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>

            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Heading1 size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Heading2 size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>

            <button onClick={() => editor.chain().focus().toggleBulletList().run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <List size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                className={`p-2 rounded-xl transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <ListOrdered size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1"></div>

            <label className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${isUploadingImage ? 'text-[#0381FE] bg-[#0381FE]/10' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                {isUploadingImage ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <ImageIcon size={16} strokeWidth={2.5}/>}
                <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={isUploadingImage} />
            </label>
        </div>
    );
};

export const NotesView = () => {
    const { user, currentProfile, selectedNoteId, setSelectedNoteId } = useAppStore();
    const { notes, loading } = useNotesData();
    const { projects } = useProjectsData();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editor State
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const selectedNote = notes.find(n => n.id === selectedNoteId);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({ inline: true, HTMLAttributes: { class: 'rounded-2xl max-h-[400px] object-cover my-4 shadow-md' } }),
            Underline,
            Placeholder.configure({ placeholder: 'Escribe tu nota aquí...' })
        ],
        content: '',
        onUpdate: ({ editor }) => {
            handleEditorChange(editor.getHTML());
        },
    });

    // Sync editor when switching notes
    useEffect(() => {
        if (editor && selectedNote && editor.getHTML() !== selectedNote.contenidoHtml) {
            editor.commands.setContent(selectedNote.contenidoHtml, { emitUpdate: false });
        } else if (editor && !selectedNote) {
            editor.commands.setContent('', { emitUpdate: false });
        }
    }, [selectedNoteId, editor]);

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const filteredNotes = notes.filter(n => {
        const matchesSearch = n.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    const handleCreateNote = async () => {
        if (!user || !currentProfile) return;
        try {
            await createNote(user.uid, currentProfile.id, {
                titulo: 'Nueva Nota',
                contenidoHtml: '',
                tags: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
        } catch (e) { console.error(e); }
    };

    const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user || !currentProfile) return;
        if (!window.confirm('¿Seguro quieres eliminar esta nota?')) return;
        if (selectedNoteId === id) setSelectedNoteId(null);
        await deleteNote(user.uid, currentProfile.id, id);
    };

    const handleEditorChange = useCallback((html: string) => {
        if (!user || !currentProfile || !selectedNoteId) return;
        setIsSaving(true);

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateNote(user.uid, currentProfile.id, selectedNoteId, {
                    contenidoHtml: html,
                    updatedAt: new Date()
                });
            } catch (e) {
                console.error("Auto-save failed", e);
            } finally {
                setIsSaving(false);
            }
        }, 1000);
    }, [user, currentProfile, selectedNoteId]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !currentProfile || !selectedNote) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
            await updateNote(user.uid, currentProfile.id, selectedNote.id, {
                titulo: e.target.value.trim() || 'Sin Título',
                updatedAt: new Date()
            });
            setIsSaving(false);
        }, 1000);
    };

    const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!user || !currentProfile || !selectedNote) return;
            const newTag = tagInput.trim().toLowerCase();
            if (selectedNote.tags.includes(newTag)) return;
            
            const newTags = [...selectedNote.tags, newTag];
            setTagInput('');
            await updateNote(user.uid, currentProfile.id, selectedNote.id, { tags: newTags });
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!user || !currentProfile || !selectedNote) return;
        const newTags = selectedNote.tags.filter(t => t !== tagToRemove);
        await updateNote(user.uid, currentProfile.id, selectedNote.id, { tags: newTags });
    };

    const handleLinkProject = async (projectId: string) => {
        if (!user || !currentProfile || !selectedNote) return;
        await updateNote(user.uid, currentProfile.id, selectedNote.id, { linkedProjectId: projectId });
    };

    const handleUnlinkProject = async () => {
        if (!user || !currentProfile || !selectedNote) return;
        await updateNote(user.uid, currentProfile.id, selectedNote.id, { linkedProjectId: null });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !currentProfile || !editor) return;
        
        setIsUploadingImage(true);
        try {
            const url = await uploadDocumentImage(user.uid, currentProfile.id, file);
            editor.chain().focus().setImage({ src: url }).run();
        } catch (error) {
            console.error("Image upload failed", error);
            alert("Error al subir la imagen.");
        } finally {
            setIsUploadingImage(false);
            e.target.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-4 p-2 md:p-6 items-start">
            
            {/* Sidebar List */}
            <div className="w-full md:w-[320px] shrink-0 h-full flex flex-col gap-4 bg-white dark:bg-[#17171A] rounded-[28px] border border-black/5 dark:border-white/5 p-5 shadow-sm">
                
                <div className="flex items-center justify-between pb-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <FileText size={20} className="text-[#0381FE]" /> Notas
                    </h3>
                    <button 
                        onClick={handleCreateNote} 
                        className="bg-[#0381FE] hover:bg-[#0270df] text-white w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-blue-500/20"
                        title="Nueva Nota"
                    >
                        <Plus size={18} strokeWidth={2.5}/>
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400 dark:text-zinc-500" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar notas o tags..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-3.5 text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-[#0381FE]/40 focus:border-[#0381FE] transition-all outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                    {loading && notes.length === 0 && (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300 dark:text-zinc-700" /></div>
                    )}
                    
                    <AnimatePresence>
                        {filteredNotes.map(note => (
                            <motion.div 
                                key={note.id} 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => setSelectedNoteId(note.id)}
                                className={`p-4 rounded-[20px] cursor-pointer border transition-all flex flex-col gap-2 group active:scale-[0.98] ${
                                    selectedNoteId === note.id 
                                        ? 'bg-[#0381FE]/10 dark:bg-[#0381FE]/15 border-[#0381FE]/30' 
                                        : 'bg-slate-50 dark:bg-[#1C1C1E] border-black/5 dark:border-white/5 hover:bg-slate-100/70 dark:hover:bg-white/5'
                                }`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${
                                        selectedNoteId === note.id ? 'text-[#0381FE] dark:text-[#387AFF]' : 'text-slate-800 dark:text-white'
                                    }`}>
                                        {note.titulo}
                                    </h4>
                                    <button 
                                        onClick={(e) => handleDeleteNote(note.id, e)} 
                                        className="text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
                                    {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : 'Sin fecha'}
                                </span>
                                {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {note.tags.slice(0, 3).map(t => (
                                            <span 
                                                key={t} 
                                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    selectedNoteId === note.id 
                                                        ? 'bg-[#0381FE]/20 text-[#0381FE] dark:text-[#387AFF]' 
                                                        : 'bg-white dark:bg-white/10 text-slate-500 dark:text-zinc-400 border border-black/5 dark:border-white/5'
                                                }`}
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Editor Pane */}
            <div className="flex-1 w-full h-full bg-white dark:bg-[#17171A] rounded-[28px] border border-black/5 dark:border-white/5 shadow-sm flex flex-col overflow-hidden relative">
                {!selectedNote ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 gap-4 p-8 text-center">
                        <BookText size={56} strokeWidth={1} className="text-slate-200 dark:text-zinc-800" />
                        <p className="font-semibold text-slate-500 dark:text-zinc-500">Selecciona o crea una nota para empezar a escribir.</p>
                    </div>
                ) : (
                    <>
                        {/* Auto-saving indicator */}
                        <AnimatePresence>
                            {isSaving && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -10 }} 
                                    className="absolute top-4 right-6 bg-[#1C1C1E] dark:bg-white text-white dark:text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-20"
                                >
                                    <Loader2 size={12} className="animate-spin" /> Guardando...
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Editor Header: Title & Tags */}
                        <div className="p-6 md:px-10 pb-4 border-b border-black/5 dark:border-white/5">
                            <input 
                                type="text"
                                defaultValue={selectedNote.titulo}
                                onChange={handleTitleChange}
                                placeholder="Título de la nota..."
                                className="w-full text-3xl md:text-5xl font-black text-slate-900 dark:text-white outline-none placeholder:text-slate-200 dark:placeholder:text-zinc-700 bg-transparent mb-4 tracking-tight"
                            />
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <Tags size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                                {selectedNote.tags.map(tag => (
                                    <div key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1C1C1E] text-slate-600 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-bold border border-black/5 dark:border-white/10">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-rose-100 p-0.5 transition-colors">
                                            <X size={10} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}
                                <input 
                                    type="text" 
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder={selectedNote.tags.length === 0 ? "Añadir etiquetas (Enter)" : "..."}
                                    className="bg-transparent text-sm font-semibold text-slate-600 dark:text-zinc-400 outline-none w-32 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                                />
                            </div>
                            
                            {/* Project Link Area */}
                            <div className="mt-4 flex items-center gap-2">
                                <Link2 size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                                {selectedNote.linkedProjectId ? (
                                    <div className="flex items-center gap-1.5 bg-[#0381FE]/10 text-[#0381FE] dark:text-[#387AFF] px-3 py-1 rounded-full text-xs font-bold border border-[#0381FE]/20">
                                        Proyecto: {projects.find(p => p.id === selectedNote.linkedProjectId)?.titulo || 'Desconocido'}
                                        <button onClick={handleUnlinkProject} className="ml-1 hover:text-rose-500 rounded-full bg-[#0381FE]/20 hover:bg-rose-100 p-0.5 transition-colors">
                                            <Unlink size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <select 
                                        onChange={(e) => handleLinkProject(e.target.value)}
                                        value=""
                                        className="bg-slate-100 dark:bg-[#1C1C1E] text-slate-600 dark:text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 outline-none cursor-pointer focus:ring-2 ring-[#0381FE]/30 transition-all"
                                    >
                                        <option value="" disabled className="bg-white dark:bg-[#17171A]">Vincular a Proyecto...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id} className="bg-white dark:bg-[#17171A]">{p.titulo}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* TipTap Editor */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <MenuBar editor={editor} onImageUpload={handleImageUpload} isUploadingImage={isUploadingImage} />
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 py-6">
                                <style>{`
                                    .ProseMirror { outline: none; min-height: 100%; color: #334155; line-height: 1.7; }
                                    .dark .ProseMirror { color: #e2e8f0; }
                                    .ProseMirror h1 { font-size: 2.25rem; font-weight: 900; margin-bottom: 1rem; color: #1e293b; letter-spacing: -0.02em; }
                                    .dark .ProseMirror h1 { color: #ffffff; }
                                    .ProseMirror h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1e293b; }
                                    .dark .ProseMirror h2 { color: #f1f5f9; }
                                    .ProseMirror p { margin-bottom: 1rem; font-size: 1.05rem; }
                                    .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                                    .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                                    .ProseMirror li { margin-bottom: 0.25rem; }
                                    .ProseMirror img { max-width: 100%; border-radius: 1.25rem; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                                    .dark .ProseMirror img { border-color: rgba(255,255,255,0.1); }
                                    .ProseMirror p.is-editor-empty:first-child::before {
                                        content: attr(data-placeholder);
                                        float: left;
                                        color: #94a3b8;
                                        pointer-events: none;
                                        height: 0;
                                    }
                                    .dark .ProseMirror p.is-editor-empty:first-child::before {
                                        color: #52525b;
                                    }
                                `}</style>
                                <EditorContent editor={editor} className="h-full" />
                            </div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
};
