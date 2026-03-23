import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, query, where, Timestamp, writeBatch, orderBy } from 'firebase/firestore';
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

export const updateTransaction = async (userId: string, profileId: string, transactionId: string, data: any) => {
  const txRef = doc(db, `users/${userId}/profiles/${profileId}/transactions/${transactionId}`);
  await updateDoc(txRef, data);
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

export const createProject = async (userId: string, profileId: string, data: any) => {
  const projRef = collection(db, `users/${userId}/profiles/${profileId}/projects`);
  await addDoc(projRef, data);
};

export const deleteProject = async (userId: string, profileId: string, projectId: string) => {
  const projRef = doc(db, `users/${userId}/profiles/${profileId}/projects/${projectId}`);
  await deleteDoc(projRef);
};

export const updateProject = async (userId: string, profileId: string, projectId: string, data: any) => {
  const projRef = doc(db, `users/${userId}/profiles/${profileId}/projects/${projectId}`);
  await updateDoc(projRef, data);
};

export const createTask = async (userId: string, profileId: string, projectId: string, data: any) => {
  const taskRef = collection(db, `users/${userId}/profiles/${profileId}/projects/${projectId}/tasks`);
  await addDoc(taskRef, data);
};

export const updateTask = async (userId: string, profileId: string, projectId: string, taskId: string, data: any) => {
  const taskRef = doc(db, `users/${userId}/profiles/${profileId}/projects/${projectId}/tasks/${taskId}`);
  await updateDoc(taskRef, data);
};

export const completeTaskWithRecurrence = async (
  userId: string, 
  profileId: string, 
  projectId: string, 
  task: any // The full task object including id, titulo, isRecurring, recurrenceType, etc.
) => {
  const taskRef = doc(db, `users/${userId}/profiles/${profileId}/projects/${projectId}/tasks/${task.id}`);
  const batch = writeBatch(db);

  // 1. Mark current task as completed
  batch.update(taskRef, { 
     isCompleted: true, 
     completedAt: new Date() 
  });

  // 2. If it's recurring, clone it with a new date
  if (task.isRecurring && task.recurrenceType) {
      let nextDate = new Date(); // default to today
      if (task.dueDate && task.dueDate.toDate) {
         nextDate = new Date(task.dueDate.toDate());
      } else if (task.dueDate instanceof Date) {
         nextDate = new Date(task.dueDate);
      }

      if (task.recurrenceType === 'daily') {
         nextDate.setDate(nextDate.getDate() + 1);
      } else if (task.recurrenceType === 'weekly') {
         nextDate.setDate(nextDate.getDate() + 7);
      } else if (task.recurrenceType === 'monthly') {
         nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const newTaskRef = doc(collection(db, `users/${userId}/profiles/${profileId}/projects/${projectId}/tasks`));
      batch.set(newTaskRef, {
         titulo: task.titulo,
         isCompleted: false,
         createdAt: new Date(),
         dueDate: nextDate,
         timeOfDay: task.timeOfDay || null,
         isRecurring: true,
         recurrenceType: task.recurrenceType
      });
  }

  await batch.commit();
};

export const deleteTask = async (userId: string, profileId: string, projectId: string, taskId: string) => {
  const taskRef = doc(db, `users/${userId}/profiles/${profileId}/projects/${projectId}/tasks/${taskId}`);
  await deleteDoc(taskRef);
};

export const createNote = async (userId: string, profileId: string, data: any) => {
  const notesRef = collection(db, `users/${userId}/profiles/${profileId}/notes`);
  await addDoc(notesRef, data);
};
