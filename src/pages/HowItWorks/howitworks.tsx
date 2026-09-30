import { FaUpload, FaMicrochip, FaClipboardCheck, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './howitworks.css';

const steps = [
  {
    id: 1,
    icon: <FaUpload className="step-icon" />,
    title: 'Upload a Photo',
    description: 'Simply take a clear picture of the affected crop leaf and upload it to our platform.',
  },
  {
    id: 2,
    icon: <FaMicrochip className="step-icon" />,
    title: 'AI Analysis',
    description: 'Our advanced AI models instantly analyze the image against thousands of known plant diseases and pests.',
  },
  {
    id: 3,
    icon: <FaClipboardCheck className="step-icon" />,
    title: 'Get Treatment Plan',
    description: 'Receive an accurate diagnosis along with actionable, eco-friendly treatment recommendations.',
  },
];

const HowItWorks = () => {
  return (
    <div className="how-it-works-page">
      <div className="hiw-hero">
        <div className="container">
          <h1 className="animate-slide-up">How <span className="text-teal">AgroRakshak</span> Works</h1>
          <p className="hiw-subtitle animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transforming crop management with state-of-the-art artificial intelligence. Three simple steps to healthier crops.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="steps-container">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className="step-card glass animate-slide-up"
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-icon-wrapper">
                {step.icon}
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>

        <div className="cta-section animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <h2>Ready to transform your farming?</h2>
          <p>Join thousands of farmers already using AgroRakshak to increase their yield.</p>
          <Link to="/" className="btn btn-primary cta-btn">
            Try AgroRakshak Now <FaArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
