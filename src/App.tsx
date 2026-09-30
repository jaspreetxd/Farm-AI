import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Components/Navbar/Navbar';
import Footer from './Components/Footer/Footer';
import Home from './pages/Home/Home';
import HowItWorks from './pages/HowItWorks/howitworks';
import BackgroundAnimation from './Components/BackgroundAnimation/BackgroundAnimation';
import HistoryDrawer from './Components/HistoryDrawer/HistoryDrawer';
import { Toaster } from 'react-hot-toast';
import type { HistoryItem } from './services/HistoryService/historyService';
import type { AnalysisResult } from './services/ResultAI/mockData';

const LOCAL_STORAGE_KEY = 'agro_rakshak_history';

function App() {
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load history from localStorage:', error);
    }
  }, []);

  const handleAddHistory = (
    type: 'text' | 'photo' | 'audio' | 'video',
    queryText: string,
    result: AnalysisResult,
    thumbnail?: string
  ) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      queryText,
      thumbnail,
      result
    };
    
    setHistoryList(prev => {
      const updated = [newItem, ...prev];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteHistory = (id: string) => {
    setHistoryList(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistoryList([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const handleRenameHistory = (id: string, newTitle: string) => {
    setHistoryList(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, queryText: newTitle } : item
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActiveResult(item.result);
  };

  return (
    <div className="app-container">
      <BackgroundAnimation />
      <Navbar 
        onOpenHistory={() => setIsHistoryOpen(true)} 
        historyCount={historyList.length} 
      />
      <main>
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                result={activeResult} 
                setResult={setActiveResult} 
                onAddHistory={handleAddHistory} 
              />
            } 
          />
          <Route path="/how-it-works" element={<HowItWorks />} />
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
        onSelect={handleSelectHistoryItem}
        onNewChat={() => setActiveResult(null)}
      />
      
      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;

