import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export interface Note {
    id: string;
    titulo: string;
    contenidoHtml: string;
    tags: string[];
    createdAt: any;
    updatedAt: any;
    excerpt?: string;
    linkedProjectId?: string;
}

export const useNotesData = () => {
    const { user, currentProfile } = useAppStore();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !currentProfile) return;
        setLoading(true);

        const notesRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/notes`);
        const sub = onSnapshot(query(notesRef, orderBy('updatedAt', 'desc')), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Note[];
            setNotes(list);
            setLoading(false);
        });

        return () => sub();
    }, [user, currentProfile]);

    return { notes, loading };
};
