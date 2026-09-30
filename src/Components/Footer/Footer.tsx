import { LuLeaf, LuTwitter, LuFacebook, LuInstagram } from 'react-icons/lu';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <div className="footer-logo">
            <LuLeaf className="logo-icon" />
            <span>AgroRakshak</span>
          </div>
          <p className="footer-tagline">Empowering farmers with AI-driven crop solutions.</p>
          <div className="social-links">
            <a href="#"><LuTwitter /></a>
            <a href="#"><LuFacebook /></a>
            <a href="#"><LuInstagram /></a>
          </div>
        </div>
        <div className="footer-links">
          <div className="link-group">
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="/how-it-works">How it works</a>
            <a href="#">Pricing</a>
          </div>
          <div className="link-group">
            <h4>Resources</h4>
            <a href="#">Blog</a>
            <a href="#">Support</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AgroRakshak. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
