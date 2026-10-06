import { LuLeaf } from 'react-icons/lu';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer-container">
      <div className="footer-brand">
        <div className="footer-logo">
          <LuLeaf className="logo-icon" />
          <span>AgroRakshak</span>
        </div>
        <p className="footer-tagline">An AI/ML project for crop health and farming guidance.</p>
      </div>
      <p className="footer-bottom">&copy; {new Date().getFullYear()} AgroRakshak</p>
    </div>
  </footer>
);

export default Footer;
