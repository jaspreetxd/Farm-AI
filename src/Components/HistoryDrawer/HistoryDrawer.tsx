import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LuX, 
  LuPlus, 
  LuMessageSquare, 
  LuPencil, 
  LuCheck, 
  LuTrash2, 
  LuSprout,
  LuTrash
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { HistoryItem } from '../../services/HistoryService/historyService';
import './HistoryDrawer.css';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: HistoryItem[];
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onClear: () => void;
  onSelect: (item: HistoryItem) => void;
  onNewChat: () => void;
}

const getGroupedHistory = (items: HistoryItem[]) => {
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const older: HistoryItem[] = [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const startOfYesterday = new Date(todayMs - 24 * 60 * 60 * 1000);
  const yesterdayMs = startOfYesterday.getTime();

  items.forEach(item => {
    if (item.timestamp >= todayMs) {
      today.push(item);
    } else if (item.timestamp >= yesterdayMs) {
      yesterday.push(item);
    } else {
      older.push(item);
    }
  });

  return { today, yesterday, older };
};

const HistoryDrawer = ({
  isOpen,
  onClose,
  historyList,
  onDelete,
  onRename,
  onClear,
  onSelect,
  onNewChat
}: HistoryDrawerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Close drawer on pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, editingId]);

  const handleCardClick = (item: HistoryItem) => {
    if (editingId) return; // Prevent selection while editing name

    // Navigate to homepage first if not currently there
    if (location.pathname !== '/') {
      navigate('/');
    }

    onSelect(item);
    onClose();

    // Smooth scroll down to the diagnosis result section
    setTimeout(() => {
      const inputSection = document.getElementById('input-section');
      if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'smooth' });
        toast.success(`Loaded diagnosis: ${item.result.problem}`);
      }
    }, 150);
  };

  const handleNewChat = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    onNewChat();
    onClose();

    setTimeout(() => {
      const inputSection = document.getElementById('input-section');
      if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'smooth' });
      }
      // Focus textarea if it exists
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
      toast.success('Started a new diagnosis session');
    }, 150);
  };

  const startEdit = (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.queryText);
  };

  const saveEdit = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
      setEditingId(null);
      toast.success('Conversation renamed');
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSingleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
    toast.success('Diagnosis removed from history');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire diagnosis history?')) {
      onClear();
      toast.success('All history cleared');
    }
  };

  const grouped = getGroupedHistory(historyList);

  const renderHistoryItem = (item: HistoryItem) => {
    const isEditing = editingId === item.id;

    return (
      <div 
        key={item.id} 
        className={`history-item-row ${isEditing ? 'editing' : ''}`}
        onClick={() => handleCardClick(item)}
      >
        <div className="item-icon-wrapper">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt="" 
              className="item-thumbnail-micro"
            />
          ) : (
            <LuMessageSquare className="item-msg-icon" />
          )}
        </div>

        {isEditing ? (
          <div className="inline-edit-container">
            <input 
              type="text" 
              className="inline-edit-input" 
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(e, item.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <button 
              className="edit-action-btn save" 
              onClick={(e) => saveEdit(e, item.id)}
              title="Save"
            >
              <LuCheck size={14} />
            </button>
            <button 
              className="edit-action-btn cancel" 
              onClick={cancelEdit}
              title="Cancel"
            >
              <LuX size={14} />
            </button>
          </div>
        ) : (
          <>
            <span className="item-title-text" title={item.queryText}>
              {item.queryText}
            </span>

            <div className="item-actions-overlay">
              <button 
                className="row-action-btn" 
                onClick={(e) => startEdit(e, item)}
                title="Rename"
                aria-label="Rename conversation"
              >
                <LuPencil size={14} />
              </button>
              <button 
                className="row-action-btn delete" 
                onClick={(e) => handleSingleDelete(e, item.id)}
                title="Delete"
                aria-label="Delete conversation"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
            
            <span className={`severity-tag-micro ${item.result.severity}`}>
              {item.result.severity[0]}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      
      <div 
        ref={drawerRef}
        className={`history-drawer left-aligned ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="drawer-header">
          <h2>
            <LuSprout className="header-icon-history" />
            AgroRakshak AI
          </h2>
          <button 
            className="close-btn" 
            onClick={onClose} 
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <LuX />
          </button>
        </div>

        <div className="new-chat-wrapper">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <LuPlus /> New chat
          </button>
        </div>

        <div className="drawer-body chat-history-body">
          {historyList.length === 0 ? (
            <div className="empty-state animate-fade-in">
              <LuMessageSquare className="empty-icon" />
              <h3>Your conversations</h3>
              <p>Previous diagnosis sessions and crop analyses will appear here.</p>
            </div>
          ) : (
            <div className="history-groups-container">
              {grouped.today.length > 0 && (
                <div className="history-group">
                  <h4 className="group-header">Today</h4>
                  <div className="group-items">
                    {grouped.today.map(renderHistoryItem)}
                  </div>
                </div>
              )}

              {grouped.yesterday.length > 0 && (
                <div className="history-group">
                  <h4 className="group-header">Yesterday</h4>
                  <div className="group-items">
                    {grouped.yesterday.map(renderHistoryItem)}
                  </div>
                </div>
              )}

              {grouped.older.length > 0 && (
                <div className="history-group">
                  <h4 className="group-header">Recent</h4>
                  <div className="group-items">
                    {grouped.older.map(renderHistoryItem)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {historyList.length > 0 && (
          <div className="drawer-footer">
            <button 
              className="btn-clear-all" 
              onClick={handleClearAll}
            >
              <LuTrash size={16} /> Clear All Sessions
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default HistoryDrawer;
