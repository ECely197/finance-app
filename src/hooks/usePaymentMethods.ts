import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';
import {
  type PaymentMethodConfig,
  DEFAULT_PAYMENT_METHODS,
  calculatePaymentBreakdown,
} from '../types/paymentMethods';

export const usePaymentMethods = () => {
  const { user, currentProfile } = useAppStore();
  const [methods, setMethods] = useState<PaymentMethodConfig[]>(DEFAULT_PAYMENT_METHODS);
  const [loading, setLoading] = useState(true);

  const storageKey = currentProfile ? `sofilu_payment_methods_${currentProfile.id}` : 'sofilu_payment_methods_default';

  // Load from local storage initially for instant render
  useEffect(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with defaults to ensure all required fields/methods exist
          const merged = DEFAULT_PAYMENT_METHODS.map((def) => {
            const found = parsed.find((p: PaymentMethodConfig) => p.id === def.id);
            return found ? { ...def, ...found } : def;
          });
          // Also include any custom methods
          const customs = parsed.filter((p: PaymentMethodConfig) => !DEFAULT_PAYMENT_METHODS.some((d) => d.id === p.id));
          setMethods([...merged, ...customs]);
        }
      }
    } catch (e) {
      console.error('Error reading payment methods from localStorage', e);
    }
  }, [storageKey]);

  // Sync with Firestore
  useEffect(() => {
    if (!user || !currentProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, `users/${user.uid}/profiles/${currentProfile.id}/settings/payment_gateways`);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.methods) && data.methods.length > 0) {
            const merged = DEFAULT_PAYMENT_METHODS.map((def) => {
              const found = data.methods.find((p: PaymentMethodConfig) => p.id === def.id);
              return found ? { ...def, ...found } : def;
            });
            const customs = data.methods.filter(
              (p: PaymentMethodConfig) => !DEFAULT_PAYMENT_METHODS.some((d) => d.id === p.id)
            );
            const finalList = [...merged, ...customs];
            setMethods(finalList);
            try {
              localStorage.setItem(storageKey, JSON.stringify(finalList));
            } catch (err) {
              console.error('Error writing to localStorage', err);
            }
          }
        } else {
          // Document doesn't exist yet, save defaults to firestore
          setDoc(docRef, { methods: DEFAULT_PAYMENT_METHODS, updatedAt: new Date() }).catch(console.error);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to payment gateways settings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, currentProfile, storageKey]);

  const saveMethods = useCallback(
    async (updatedMethods: PaymentMethodConfig[]) => {
      setMethods(updatedMethods);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedMethods));
      } catch (err) {
        console.error('Error writing to localStorage', err);
      }

      if (user && currentProfile) {
        const docRef = doc(db, `users/${user.uid}/profiles/${currentProfile.id}/settings/payment_gateways`);
        await setDoc(docRef, {
          methods: updatedMethods,
          updatedAt: new Date(),
        });
      }
    },
    [user, currentProfile, storageKey]
  );

  const updateMethod = useCallback(
    async (id: string, updates: Partial<PaymentMethodConfig>) => {
      const next = methods.map((m) => (m.id === id ? { ...m, ...updates } : m));
      await saveMethods(next);
    },
    [methods, saveMethods]
  );

  const resetToDefaults = useCallback(async () => {
    await saveMethods(DEFAULT_PAYMENT_METHODS);
  }, [saveMethods]);

  const addCustomMethod = useCallback(
    async (newMethod: Omit<PaymentMethodConfig, 'id'>) => {
      const id = 'custom_' + Date.now().toString(36);
      const created: PaymentMethodConfig = {
        ...newMethod,
        id,
        isCustom: true,
      };
      await saveMethods([...methods, created]);
      return created;
    },
    [methods, saveMethods]
  );

  const deleteMethod = useCallback(
    async (id: string) => {
      const filtered = methods.filter((m) => m.id !== id);
      await saveMethods(filtered);
    },
    [methods, saveMethods]
  );

  const getMethod = useCallback(
    (id: string) => {
      return methods.find((m) => m.id === id) || DEFAULT_PAYMENT_METHODS.find((m) => m.id === id);
    },
    [methods]
  );

  return {
    methods,
    loading,
    saveMethods,
    updateMethod,
    resetToDefaults,
    addCustomMethod,
    deleteMethod,
    getMethod,
    calculatePaymentBreakdown,
  };
};
