import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export const useObligationsData = () => {
   const { user, currentProfile } = useAppStore();
   const [obligations, setObligations] = useState<any[]>([]);
   const [incomes, setIncomes] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!user || !currentProfile) return;
      setLoading(true);

      const obRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/obligations`);
      const unsubOb = onSnapshot(query(obRef), (snap) => {
         setObligations(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });

      const txRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/transactions`);
      const qTx = query(txRef, where('type', '==', 'ingreso'));
      const unsubTx = onSnapshot(qTx, (snap) => {
         setIncomes(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });

      setTimeout(() => setLoading(false), 500);

      return () => { 
          unsubOb(); 
          unsubTx(); 
      };
   }, [user, currentProfile]);

   const processedObligations = useMemo(() => {
     return obligations.map(ob => {
         let fInicio = ob.fechaInicio?.toDate 
            ? ob.fechaInicio.toDate() 
            : (ob.fechaInicio ? new Date(ob.fechaInicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
         
         let fLimit = ob.fechaLimite?.toDate 
            ? ob.fechaLimite.toDate() 
            : new Date(ob.fechaLimite);
         
         fInicio.setHours(0,0,0,0);
         fLimit.setHours(23,59,59,999);
         
         const validIncomes = incomes.filter(inc => {
             const d = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date.seconds * 1000);
             return d >= fInicio && d <= fLimit; 
         });
         
         const totalIncome = validIncomes.reduce((sum, i) => sum + i.amount, 0);
         const progress = ob.montoObjetivo > 0 ? Math.min((totalIncome / ob.montoObjetivo) * 100, 100) : 100;
         const remainingAmount = Math.max(ob.montoObjetivo - totalIncome, 0);

         const now = new Date();
         now.setHours(0,0,0,0);
         const diffTime = fLimit.getTime() - now.getTime();
         const daysRemaining = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);

         // Tendencia de ventas
         const daysTotal = Math.max(Math.ceil((fLimit.getTime() - fInicio.getTime()) / (1000 * 60 * 60 * 24)), 1);
         const expectedProgress = ((daysTotal - daysRemaining) / daysTotal) * 100;
         const isGoodTrend = progress >= expectedProgress && progress > 0;

         return {
            ...ob,
            totalIncome,
            progress,
            remainingAmount,
            daysRemaining,
            fInicio,
            fLimit,
            isGoodTrend
         };
     }).sort((a,b) => {
         if (a.cumplida && !b.cumplida) return 1;
         if (!a.cumplida && b.cumplida) return -1;
         return a.daysRemaining - b.daysRemaining;
     });
   }, [obligations, incomes]);

   return { obligations, incomes, processedObligations, loading };
}
