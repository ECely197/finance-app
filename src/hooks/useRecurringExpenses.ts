import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export interface RecurringExpense {
  id: string;
  titulo: string;
  monto: number;
  categoryId: string;
  frecuencia: string;
  ultimoPago: Date | null;
  createdAt?: Date;
}

export const useRecurringExpenses = () => {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, currentProfile } = useAppStore();

  useEffect(() => {
    if (!user || !currentProfile) {
      setRecurringExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const expensesRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/recurring_expenses`);
    const q = query(expensesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          ultimoPago: data.ultimoPago?.toDate ? data.ultimoPago.toDate() : (data.ultimoPago ? new Date(data.ultimoPago) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined)
        } as RecurringExpense;
      });
      setRecurringExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recurring expenses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentProfile]);

  return { recurringExpenses, loading };
};
