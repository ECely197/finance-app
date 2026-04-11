import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadSeparadoImage = async (userId: string, profileId: string, file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const filePath = `users/${userId}/profiles/${profileId}/separados/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadDocumentImage = async (userId: string, profileId: string, file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const filePath = `users/${userId}/profiles/${profileId}/notes_images/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
