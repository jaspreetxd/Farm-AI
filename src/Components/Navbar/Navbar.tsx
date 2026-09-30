import { Link } from 'react-router-dom';
import { LuLeaf, LuMenu } from 'react-icons/lu';
import './Navbar.css';

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
}

const Navbar = ({ onOpenHistory, historyCount }: NavbarProps) => {
  return (
    <header className="navbar glass">
      <div className="container nav-container">
        <div className="nav-left">
          <button 
            className="hamburger-btn" 
            onClick={onOpenHistory}
            title="Menu"
            aria-label="Toggle Navigation Menu"
          >
            <LuMenu />
            {historyCount > 0 && <span className="hamburger-badge">{historyCount}</span>}
          </button>
          
          <Link to="/" className="nav-logo">
            <LuLeaf className="logo-icon" />
            <span>AgroRakshak</span>
          </Link>
        </div>
        
        <nav className="nav-links">
          <a href="/#features">Features</a>
          <Link to="/how-it-works">How it Works</Link>
        </nav>
        
        <div className="nav-actions">
          <button className="btn btn-primary">Try Now</button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;