import { LuArrowRight, LuSprout } from 'react-icons/lu';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container hero-container animate-slide-up">
        <div className="hero-badge">
          <LuSprout className="logo-icon" />
          <span>AI-Powered Agriculture</span>
        </div>
        <h1 className="hero-title">
          Diagnose Crop Issues in <span className="text-gradient">Seconds</span>
        </h1>
        <p className="hero-subtitle">
          Empowering farmers with instant, accurate AI guidance. Upload a photo, type a problem, or record an audio clip to get a complete action plan to save your crops.
        </p>
        <div className="hero-actions">
          <a href="#input-section" className="btn btn-primary">
            Start Diagnosing <LuArrowRight />
          </a>
          <a href="/how-it-works" className="btn btn-outline">
            How It Works
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
