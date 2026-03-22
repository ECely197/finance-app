import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export const useDashboardData = (startStr: string, endStr: string) => {
  const { user, currentProfile } = useAppStore();
  const [data, setData] = useState<{ transactions: any[], categories: any[], investments: any[], linkedIncomes: any[] }>({
    transactions: [],
    categories: [],
    investments: [],
    linkedIncomes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentProfile) return;

    let unsubscribeTxs: () => void;
    let unsubscribeCats: () => void;
    let unsubscribeInvs: () => void;
    let unsubscribeLinked: () => void;

    const start = new Date(startStr);
    const end = new Date(endStr);

    setLoading(true);

    try {
      // 1. Transactions subscription (for the date range)
      const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
      const txQuery = query(txRef, where('date', '>=', start), where('date', '<=', end));
      
      unsubscribeTxs = onSnapshot(txQuery, (snap) => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setData(prev => ({ ...prev, transactions: txs }));
      });

      // 2. Categories subscription (all categories for mapping)
      const catRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/categories`);
      unsubscribeCats = onSnapshot(catRef, (snap) => {
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setData(prev => ({ ...prev, categories: cats }));
      });

      // 3. Investments and Linked Incomes (for Business ROI)
      if (currentProfile.type === 'Business') {
          // Fetch all investments
          const invQuery = query(txRef, where('type', '==', 'inversion'));
          unsubscribeInvs = onSnapshot(invQuery, (snap) => {
             const invs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
             setData(prev => ({ ...prev, investments: invs }));
          });

          // Fetch all incomes (to find linked ones independently of date range)
          const incQuery = query(txRef, where('type', '==', 'ingreso'));
          unsubscribeLinked = onSnapshot(incQuery, (snap) => {
             const incomes = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => d.inversionIdRelacionada);
             setData(prev => ({ ...prev, linkedIncomes: incomes }));
          });
      }

      // Allow initial load
      setTimeout(() => setLoading(false), 800);

    } catch (error) {
      console.error(error);
      setLoading(false);
    }

    return () => {
      if (unsubscribeTxs) unsubscribeTxs();
      if (unsubscribeCats) unsubscribeCats();
      if (unsubscribeInvs) unsubscribeInvs();
      if (unsubscribeLinked) unsubscribeLinked();
    };

  }, [user, currentProfile, startStr, endStr]);

  return { ...data, loading };
};
