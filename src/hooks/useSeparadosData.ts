import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export interface Separado {
  id: string;
  fotoUrl: string;
  valorTotal: number;
  totalAbonado: number;
  cliente: string;
  estado: 'pendiente' | 'completado';
  createdAt?: Date;
}

export const useSeparadosData = () => {
  const [separados, setSeparados] = useState<Separado[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, currentProfile } = useAppStore();

  useEffect(() => {
    if (!user || !currentProfile) {
      setSeparados([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/separados`);
    const q = query(ref, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        return {
          id: doc.id,
          ...item,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate() : (item.createdAt ? new Date(item.createdAt) : undefined)
        } as Separado;
      });
      setSeparados(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching separados:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentProfile]);

  return { separados, loading };
};
