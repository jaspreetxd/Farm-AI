import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LuLeaf, LuMenu, LuUserRound, LuX, LuHistory,
  LuLogOut, LuChevronRight, LuWheat,
} from 'react-icons/lu';
import LLMSettings from '../LLMSettings/LLMSettings';
import './Navbar.css';

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
  userEmail: string;
  userName: string;
  onSignOut: () => void;
}

const Navbar = ({ onOpenHistory, historyCount, userEmail, userName, onSignOut }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const openHistory = () => {
    closeMenu();
    onOpenHistory();
  };
  return (
    <>
      <header className="navbar glass">
        <div className="container nav-container">
          <div className="nav-brand-group">
            <button
              className={`hamburger-btn ${menuOpen ? 'is-open' : ''}`}
              onClick={() => setMenuOpen((open) => !open)}
              title="Open app menu"
              aria-label={menuOpen ? 'Close app menu' : 'Open app menu'}
              aria-expanded={menuOpen}
              aria-controls="app-menu"
            >
              {menuOpen ? <LuX /> : <LuMenu />}
              {historyCount > 0 && <span className="hamburger-badge">{historyCount > 99 ? '99+' : historyCount}</span>}
            </button>
            <Link to="/" className="nav-logo" onClick={closeMenu} aria-label="AgroRakshak home">
              <LuLeaf className="logo-icon" />
              <span>AgroRakshak</span>
            </Link>
          </div>

          <nav className="nav-links" aria-label="Main navigation">
            <Link to="/#features" onClick={closeMenu}>Features</Link>
            <Link to="/how-it-works" onClick={closeMenu}>How it works</Link>
          </nav>

          <div className="nav-right">
            <Link className="nav-account-link" to="/account" title="Account settings" onClick={closeMenu}>
              <span className="nav-account-avatar">{userName.trim().slice(0, 1).toUpperCase() || <LuUserRound />}</span>
              <span className="nav-account-label"><strong>{userName}</strong><small>{userEmail}</small></span>
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button className="app-menu-overlay" onClick={closeMenu} aria-label="Close menu" />
          <aside id="app-menu" className="app-menu-panel" aria-label="Main menu">
            <div className="app-menu-header">
              <div className="app-menu-brand"><span className="app-menu-brand-icon"><LuWheat /></span><span>Farm workspace</span></div>
              <button className="app-menu-close" type="button" onClick={closeMenu} aria-label="Close menu"><LuX /></button>
            </div>

            <Link className="app-menu-profile" to="/account" onClick={closeMenu}>
              <span className="app-menu-avatar">{userName.trim().slice(0, 1).toUpperCase() || <LuUserRound />}</span>
              <span className="app-menu-profile-copy"><strong>{userName}</strong><small>{userEmail}</small></span>
              <LuChevronRight className="app-menu-chevron" />
            </Link>

            <div className="app-menu-scroll">
              <p className="app-menu-section-title">Recents</p>
              <button className="app-menu-item" onClick={openHistory}>
                <span className="app-menu-item-icon"><LuHistory /></span>
                <span className="app-menu-item-text">Diagnosis history</span>
                {historyCount > 0 && <span className="app-menu-count">{historyCount > 99 ? '99+' : historyCount}</span>}
                <LuChevronRight className="app-menu-chevron" />
              </button>

              <div className="app-menu-ai-settings">
                <div><p className="app-menu-section-title">AI preferences</p><span>Choose your AI engine</span></div>
                <LLMSettings />
              </div>

            </div>

            <div className="app-menu-footer">
              <button className="app-menu-item app-menu-signout" onClick={() => { closeMenu(); onSignOut(); }}>
                <span className="app-menu-item-icon"><LuLogOut /></span><span>Sign out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default Navbar;
