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
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 rounded-t-2xl">
            <button onClick={() => editor.chain().focus().toggleBold().run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Bold size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Italic size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <UnderlineIcon size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Heading1 size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Heading2 size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button onClick={() => editor.chain().focus().toggleBulletList().run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <List size={16} strokeWidth={2.5}/>
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                <ListOrdered size={16} strokeWidth={2.5}/>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <label className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${isUploadingImage ? 'text-blue-500 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
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
            Image.configure({ inline: true, HTMLAttributes: { class: 'rounded-xl max-h-[400px] object-cover my-4' } }),
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
            // Auto se seleccionará la primera en la vista porque createdAt refresca pero dejemos que fluya
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
            e.target.value = ''; // reset input
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-4 p-2 md:p-6 items-start">
            
            {/* Sidebar List (30%) */}
            <div className="w-full md:w-[320px] shrink-0 h-full flex flex-col gap-4 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
                
                <div className="flex items-center justify-between pb-2">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <FileText size={20} className="text-blue-500" /> Notas
                    </h3>
                    <button onClick={handleCreateNote} className="bg-slate-800 hover:bg-slate-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm">
                        <Plus size={18} strokeWidth={2.5}/>
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar notas o tags..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 transition-shadow outline-none"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
                    {loading && notes.length === 0 && (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
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
                                className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col gap-2 group ${selectedNoteId === note.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${selectedNoteId === note.id ? 'text-blue-800' : 'text-slate-800'}`}>
                                        {note.titulo}
                                    </h4>
                                    <button onClick={(e) => handleDeleteNote(note.id, e)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400">
                                    {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : 'Sin fecha'}
                                </span>
                                {note.tags && note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {note.tags.slice(0, 3).map(t => (
                                            <span key={t} className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${selectedNoteId === note.id ? 'bg-blue-200/50 text-blue-700' : 'bg-white border border-slate-200 text-slate-500'}`}>
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

            {/* Main Editor Pane (70%) */}
            <div className="flex-1 w-full h-full bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden relative">
                {!selectedNote ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                        <BookText size={48} strokeWidth={1} className="text-slate-200" />
                        <p className="font-semibold">Selecciona o crea una nota para empezar.</p>
                    </div>
                ) : (
                    <>
                        {/* Auto-saving indicator */}
                        <AnimatePresence>
                            {isSaving && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-4 right-6 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-20">
                                    <Loader2 size={12} className="animate-spin" /> Guardando...
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Editor Header: Title & Tags */}
                        <div className="p-6 md:px-10 pb-4 border-b border-slate-50">
                            <input 
                                type="text"
                                defaultValue={selectedNote.titulo}
                                onChange={handleTitleChange}
                                placeholder="Título de la nota..."
                                className="w-full text-3xl md:text-5xl font-black text-slate-800 outline-none placeholder:text-slate-200 bg-transparent mb-4"
                            />
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <Tags size={16} className="text-slate-400 shrink-0" />
                                {selectedNote.tags.map(tag => (
                                    <div key={tag} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500 rounded-full bg-slate-200 hover:bg-rose-100 p-0.5 transition-colors">
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
                                    className="bg-transparent text-sm font-semibold text-slate-600 outline-none w-32 placeholder:text-slate-300"
                                />
                            </div>
                            
                            {/* Project Link Area */}
                            <div className="mt-4 flex items-center gap-2">
                                <Link2 size={16} className="text-slate-400 shrink-0" />
                                {selectedNote.linkedProjectId ? (
                                    <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-100">
                                        Proyecto: {projects.find(p => p.id === selectedNote.linkedProjectId)?.titulo || 'Desconocido'}
                                        <button onClick={handleUnlinkProject} className="ml-1 hover:text-rose-500 rounded-full bg-blue-100 hover:bg-rose-100 p-0.5 transition-colors">
                                            <Unlink size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <select 
                                        onChange={(e) => handleLinkProject(e.target.value)}
                                        value=""
                                        className="bg-slate-50 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer focus:ring-2 ring-blue-100 transition-shadow"
                                    >
                                        <option value="" disabled>Vincular a Proyecto...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.titulo}</option>
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
                                    .ProseMirror h1 { font-size: 2.25rem; font-weight: 900; margin-bottom: 1rem; color: #1e293b; letter-spacing: -0.02em; }
                                    .ProseMirror h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1e293b; }
                                    .ProseMirror p { margin-bottom: 1rem; font-size: 1.05rem; }
                                    .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                                    .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                                    .ProseMirror li { margin-bottom: 0.25rem; }
                                    .ProseMirror img { max-width: 100%; border-radius: 0.75rem; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                                    .ProseMirror p.is-editor-empty:first-child::before {
                                        content: attr(data-placeholder);
                                        float: left;
                                        color: #cbd5e1;
                                        pointer-events: none;
                                        height: 0;
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
