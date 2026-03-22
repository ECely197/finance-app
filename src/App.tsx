import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { getProfiles } from './lib/firestore';
import { useAppStore } from './store/useAppStore';

import { MainLayout } from './components/layout/MainLayout';
import { AuthForm } from './components/auth/AuthForm';
import { TransactionForm } from './components/transactions/TransactionForm';
import { DashboardView } from './components/dashboard/DashboardView';
import { OnboardingProfile } from './components/auth/OnboardingProfile';
import { SettingsView } from './components/settings/SettingsView';
import { InvestmentsView } from './components/investments/InvestmentsView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { ObligationsView } from './components/obligations/ObligationsView';

function App() {
  const { user, setUser, profiles, setProfiles, setCurrentProfile, isLoading, setIsLoading } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Fetch user profiles logic
          const profilesData = await getProfiles(currentUser.uid);
          // @ts-ignore
          setProfiles(profilesData);
          if (profilesData.length > 0) {
             // @ts-ignore
             setCurrentProfile(profilesData[0]);
          }
        } catch (error) {
          console.error("Error fetching profiles:", error);
        }
      } else {
        setProfiles([]);
        setCurrentProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfiles, setCurrentProfile, setIsLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="w-16 h-16 rounded-3xl bg-blue-100 flex items-center justify-center animate-pulse shadow-inner">
            <span className="text-blue-600 font-bold text-2xl">F</span>
         </div>
      </div>
    );
  }

  // Si no hay perfiles creados, forzar Onboarding
  if (user && !isLoading && profiles.length === 0) {
    return <OnboardingProfile />;
  }

  return (
    <Router>
      <Routes>
        {user ? (
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="add" element={
              <div className="py-2">
                <TransactionForm />
              </div>
            } />
            <Route path="transactions" element={<TransactionsView />} />
            <Route path="investments" element={<InvestmentsView />} />
            <Route path="obligations" element={<ObligationsView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/login" element={<AuthForm />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
