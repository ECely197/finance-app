import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export const useInvestmentsData = () => {
  const { user, currentProfile } = useAppStore();
  const [data, setData] = useState<{ investments: any[], linkedIncomes: any[], categories: Record<string, string> }>({
    investments: [],
    linkedIncomes: [],
    categories: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentProfile) return;

    setLoading(true);
    let unsubscribeInvs: () => void;
    let unsubscribeIncomes: () => void;
    let unsubscribeCats: () => void;

    try {
      const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
      
      // Select purely Investments
      const invQuery = query(txRef, where('type', '==', 'inversion'));
      unsubscribeInvs = onSnapshot(invQuery, (snap) => {
         const invs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
         setData(prev => ({ ...prev, investments: invs }));
      });

      // Select purely Incomes (We filter the payload array client side since firebase natively limits complex "not null / exists" operators combining multiple paths)
      const incQuery = query(txRef, where('type', '==', 'ingreso'));
      unsubscribeIncomes = onSnapshot(incQuery, (snap) => {
         const incomes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
           .filter((d: any) => !!d.inversionIdRelacionada);
         
         // Chronological Sort
         incomes.sort((a: any, b: any) => {
             const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date.seconds * 1000);
             const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date.seconds * 1000);
             return dB.getTime() - dA.getTime();
         });
         setData(prev => ({ ...prev, linkedIncomes: incomes }));
      });

      // Fetch Categories purely for Mapping ID's to human readable strings
      const catRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/categories`);
      unsubscribeCats = onSnapshot(catRef, (snap) => {
         const catMap: Record<string, string> = {};
         snap.docs.forEach(d => {
            catMap[d.id] = d.data().name;
         });
         setData(prev => ({ ...prev, categories: catMap }));
      });

      // Synthetic Load Threshold 500ms
      setTimeout(() => setLoading(false), 500);

    } catch(err) {
      console.error(err);
      setLoading(false);
    }

    return () => {
      if(unsubscribeInvs) unsubscribeInvs();
      if(unsubscribeIncomes) unsubscribeIncomes();
      if(unsubscribeCats) unsubscribeCats();
    };
  }, [user, currentProfile]);

  return { ...data, loading };
}
