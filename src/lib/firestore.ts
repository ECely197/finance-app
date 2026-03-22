import { doc, setDoc, collection, query, where, getDocs, orderBy, Timestamp, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Profile {
  id?: string;
  name: string;
  type: 'Personal' | 'Business' | 'Project';
  createdAt: Date;
}

export interface Transaction {
  amount: number;
  type: 'ingreso' | 'gasto_fijo' | 'gasto_variable' | 'gasto_innecesario' | 'inversion';
  date: Date;
  categoryId: string;
  inversionIdRelacionada?: string; 
  description?: string;
}

export const createProfile = async (userId: string, profileId: string, profileData: Profile): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/profiles/${profileId}`);
  await setDoc(profileRef, {
    ...profileData,
    createdAt: Timestamp.fromDate(profileData.createdAt)
  });
};

export const updateProfile = async (userId: string, profileId: string, data: Partial<Profile>) => {
  const profileRef = doc(db, `users/${userId}/profiles/${profileId}`);
  await updateDoc(profileRef, data as any);
};

export const deleteProfile = async (userId: string, profileId: string) => {
  const profileRef = doc(db, `users/${userId}/profiles/${profileId}`);
  await deleteDoc(profileRef);
};

export const createTransaction = async (
  userId: string, 
  profileId: string, 
  transactionId: string, 
  transactionData: Transaction
): Promise<void> => {
  const transactionRef = doc(db, `users/${userId}/profiles/${profileId}/transactions/${transactionId}`);
  await setDoc(transactionRef, {
    ...transactionData,
    date: Timestamp.fromDate(transactionData.date)
  });
};

export const getTransactionsByDateRange = async (
  userId: string, 
  profileId: string, 
  startDate: Date, 
  endDate: Date
) => {
  const transactionsRef = collection(db, `users/${userId}/profiles/${profileId}/transactions`);
  const q = query(
    transactionsRef,
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
  }));
};

export const getProfiles = async (userId: string) => {
  const profilesRef = collection(db, `users/${userId}/profiles`);
  const snapshot = await getDocs(profilesRef);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Profile[];
};

export const getCategories = async (userId: string, profileId: string) => {
  const categoriesRef = collection(db, `users/${userId}/profiles/${profileId}/categories`);
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
};

export const getInvestments = async (userId: string, profileId: string) => {
  const transactionsRef = collection(db, `users/${userId}/profiles/${profileId}/transactions`);
  const q = query(transactionsRef, where('type', '==', 'inversion'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
};

export const getIncomesLinkedToInvestment = async (userId: string, profileId: string, investmentId: string) => {
  const transactionsRef = collection(db, `users/${userId}/profiles/${profileId}/transactions`);
  const q = query(
    transactionsRef, 
    where('type', '==', 'ingreso'),
    where('inversionIdRelacionada', '==', investmentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
};

export const createCategory = async (
  userId: string, 
  profileId: string, 
  categoryId: string, 
  name: string, 
  type: string
): Promise<void> => {
  const catRef = doc(db, `users/${userId}/profiles/${profileId}/categories/${categoryId}`);
  await setDoc(catRef, { name, type });
};

export const deleteCategory = async (userId: string, profileId: string, categoryId: string) => {
  const catRef = doc(db, `users/${userId}/profiles/${profileId}/categories/${categoryId}`);
  await deleteDoc(catRef);
};

export const deleteTransaction = async (userId: string, profileId: string, transactionId: string) => {
  const txRef = doc(db, `users/${userId}/profiles/${profileId}/transactions/${transactionId}`);
  await deleteDoc(txRef);
};

export const createObligation = async (userId: string, profileId: string, data: any) => {
  const obRef = collection(db, `users/${userId}/profiles/${profileId}/obligations`);
  await addDoc(obRef, data);
};

export const deleteObligation = async (userId: string, profileId: string, obligationId: string) => {
  const obRef = doc(db, `users/${userId}/profiles/${profileId}/obligations/${obligationId}`);
  await deleteDoc(obRef);
};

export const updateObligation = async (userId: string, profileId: string, obligationId: string, data: any) => {
  const obRef = doc(db, `users/${userId}/profiles/${profileId}/obligations/${obligationId}`);
  await updateDoc(obRef, data);
};
