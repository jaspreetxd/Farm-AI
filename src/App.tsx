import { useEffect, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer/Footer';
import Home from './pages/Home/Home';
import HowItWorks from './pages/HowItWorks/howitworks';
import BackgroundAnimation from './Components/BackgroundAnimation/BackgroundAnimation';
import HistoryDrawer from './Components/HistoryDrawer/HistoryDrawer';
import AuthPage from './Components/AuthPage/AuthPage';
import Account from './pages/Account/Account';
import { signOut } from './services/Auth/authService';
import { isSupabaseConfigured, supabase } from './services/Auth/supabase';
import {
  addUserHistory,
  clearUserHistory,
  deleteUserHistory,
  listUserHistory,
  renameUserHistory,
} from './services/HistoryService/cloudHistoryService';
import type { HistoryItem } from './services/HistoryService/historyService';
import type { AnalysisResult } from './services/ResultAI/resultai';

function getHistoryLoadErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const details = error as { code?: unknown; message?: unknown };
    if (details.code === 'PGRST205' || details.code === '42P01') {
      return 'Your Supabase history table is not set up yet. Run supabase/schema.sql in the project SQL Editor, then reload.';
    }
    if (details.code === '42501') {
      return 'Supabase blocked history access. Check the diagnosis_history table grants and RLS policies in supabase/schema.sql.';
    }
    if (typeof details.message === 'string' && details.message.trim()) {
      return `Could not load your saved history: ${details.message}`;
    }
  }
  if (error instanceof Error) return `Could not load your saved history: ${error.message}`;
  return 'Could not load your saved history. Check the Supabase database setup and connection.';
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(supabase));
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const sessionUserId = useRef<string | null>(null);
  const authEventSeen = useRef(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventSeen.current = true;
      sessionUserId.current = nextSession?.user.id ?? null;
      setSession(nextSession);
      setHistoryList([]);
      setActiveResult(null);
      setIsHistoryOpen(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) toast.error(error.message);
      if (!authEventSeen.current) {
        sessionUserId.current = data.session?.user.id ?? null;
        setSession(data.session);
      }
      setIsCheckingSession(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      toast.error(error instanceof Error ? error.message : 'Could not check your sign-in status.');
      setIsCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    const ownerId = session.user.id;
    let active = true;
    void listUserHistory().then((items) => {
      if (active && sessionUserId.current === ownerId) setHistoryList(items);
    }).catch((error: unknown) => {
      if (active && sessionUserId.current === ownerId) {
        toast.error(getHistoryLoadErrorMessage(error));
      }
    });
    return () => { active = false; };
  }, [session?.user.id]);

  const handleAddHistory = (
    type: 'text' | 'photo',
    queryText: string,
    result: AnalysisResult,
    thumbnail?: string
  ) => {
    const ownerId = sessionUserId.current;
    if (!ownerId) return;
    void addUserHistory({ type, queryText, result, thumbnail }).then((item) => {
      if (sessionUserId.current === ownerId) setHistoryList((previous) => [item, ...previous].slice(0, 100));
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? `Diagnosis completed, but history could not be saved: ${error.message}` : 'Diagnosis completed, but history could not be saved.');
    });
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteUserHistory(id);
      setHistoryList((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this history item.');
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearUserHistory();
      setHistoryList([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear your history.');
    }
  };

  const handleRenameHistory = async (id: string, newTitle: string) => {
    try {
      await renameUserHistory(id, newTitle);
      setHistoryList((previous) => previous.map((item) => item.id === id ? { ...item, queryText: newTitle } : item));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not rename this history item.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  return (
    <div className="app-container">
      <BackgroundAnimation />
      {isCheckingSession ? (
        <main className="auth-page"><p role="status">Checking your account…</p></main>
      ) : !isSupabaseConfigured || !session ? (
        <AuthPage />
      ) : (
        <>
          <Navbar
            onOpenHistory={() => setIsHistoryOpen(true)}
            historyCount={historyList.length}
            userEmail={session.user.email || 'Signed in'}
            userName={String(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Farmer')}
            onSignOut={handleSignOut}
          />
          <main>
            <Routes>
              <Route
                path="/"
                element={<Home result={activeResult} setResult={setActiveResult} onAddHistory={handleAddHistory} />}
              />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/account" element={<Account user={session.user} />} />
            </Routes>
          </main>
          <Footer />
          <HistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            historyList={historyList}
            onDelete={handleDeleteHistory}
            onRename={handleRenameHistory}
            onClear={handleClearHistory}
            onSelect={(item) => setActiveResult(item.result)}
            onNewChat={() => setActiveResult(null)}
          />
        </>
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
