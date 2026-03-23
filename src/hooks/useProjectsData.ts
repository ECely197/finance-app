import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../store/useAppStore';

export interface AppTask {
   id: string;
   titulo: string;
   isCompleted: boolean;
   createdAt: any;
   dueDate?: any;
   timeOfDay?: string | null;
   isRecurring?: boolean;
   recurrenceType?: "daily" | "weekly" | "monthly" | null;
}

export interface Project {
   id?: string;
   titulo: string;
   fechaInicio: any;
   fechaLimite: any;
   createdAt: any;
   tasks: AppTask[];
   progress: number;
   daysRemaining: number;
}

export const useProjectsData = () => {
   const { user, currentProfile } = useAppStore();
   const [rawProjects, setRawProjects] = useState<any[]>([]);
   const [tasksByProject, setTasksByProject] = useState<Record<string, AppTask[]>>({});
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!user || !currentProfile) return;
      setLoading(true);

      const projRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/projects`);
      let unsubTasksMap: Record<string, () => void> = {};

      const unsubProj = onSnapshot(query(projRef, orderBy('createdAt', 'desc')), (snap) => {
         const pDocs = snap.docs.map(d => ({id: d.id, ...d.data()}));
         setRawProjects(pDocs);
         
         // Manage tasks listeners
         const currentIds = new Set(pDocs.map(p => p.id));
         
         // Add missing listeners
         pDocs.forEach(proj => {
             if (!unsubTasksMap[proj.id]) {
                 const tRef = collection(db, `users/${user.uid}/profiles/${currentProfile.id}/projects/${proj.id}/tasks`);
                 unsubTasksMap[proj.id] = onSnapshot(query(tRef, orderBy('createdAt', 'asc')), (tSnap) => {
                     const ts = tSnap.docs.map(t => ({id: t.id, ...t.data()})) as AppTask[];
                     setTasksByProject(prev => ({ ...prev, [proj.id]: ts }));
                 });
             }
         });
         
         // Remove dead listeners
         Object.keys(unsubTasksMap).forEach(id => {
             if (!currentIds.has(id)) {
                 unsubTasksMap[id]();
                 delete unsubTasksMap[id];
                 setTasksByProject(prev => {
                     const next = {...prev};
                     delete next[id];
                     return next;
                 });
             }
         });
         
         setLoading(false);
      });

      return () => { 
          unsubProj();
          Object.values(unsubTasksMap).forEach(unsub => unsub());
      };
   }, [user, currentProfile]);

   const projects = rawProjects.map(proj => {
       const tasks = tasksByProject[proj.id] || [];
       const total = tasks.length;
       const completed = tasks.filter((t: any) => t.isCompleted).length;
       const progress = total === 0 ? 0 : (completed / total) * 100;
       
       const fLimit = proj.fechaLimite?.toDate ? proj.fechaLimite.toDate() : (proj.fechaLimite ? new Date(proj.fechaLimite) : new Date());
       const now = new Date();
       now.setHours(0,0,0,0);
       const limitD = new Date(fLimit);
       limitD.setHours(23,59,59,999);
       const daysRemaining = Math.max(Math.ceil((limitD.getTime() - now.getTime()) / (1000*60*60*24)), 0);

       return { ...proj, tasks, progress, daysRemaining };
   }).sort((a,b) => a.daysRemaining - b.daysRemaining) as Project[];

   return { projects, loading };
}
