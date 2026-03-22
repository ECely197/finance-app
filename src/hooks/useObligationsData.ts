import { useState, useEffect } from 'react';
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

   return { obligations, incomes, loading };
}
