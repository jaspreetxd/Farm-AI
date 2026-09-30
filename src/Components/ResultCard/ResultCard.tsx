import type { AnalysisResult } from '../../services/ResultAI/mockData';
import { FiCheckCircle, FiAlertTriangle, FiTool,
  FiSearch, FiScissors, FiTrash2, FiDroplet, FiWind,
  FiActivity, FiShield, FiSun, FiRefreshCw, FiAlertCircle,
  FiEye, FiPackage, FiZap, FiAnchor, FiThumbsUp } from 'react-icons/fi';
import './ResultCard.css';

// Cycle through relevant farming icons per step index
const STEP_ICONS = [
  FiSearch, FiScissors, FiTrash2, FiDroplet, FiWind,
  FiActivity, FiShield, FiSun, FiRefreshCw, FiAlertCircle,
  FiEye, FiPackage, FiZap, FiAnchor, FiThumbsUp,
];

interface ResultCardProps {
  data: AnalysisResult;
}

const ResultCard = ({ data }: ResultCardProps) => {
  return (
    <div className="result-card-container">
      {/* Header Summary */}
      <div className="result-header glass">
        <div className="header-icon">
          {data.severity === 'high' ? (
            <FiAlertTriangle className="icon-high" />
          ) : (
            <FiCheckCircle className="icon-low" />
          )}
        </div>
        <div className="header-content">
          <h2>{data.problem}</h2>
          <span className={`severity-badge ${data.severity}`}>{data.severity} Severity</span>
        </div>
      </div>

      <div className="result-body">
        {/* Likely Causes */}
        <div className="info-section">
          <h3>Likely Causes</h3>
          <p>{data.causes}</p>
        </div>

        {/* Required Tools */}
        <div className="info-section">
          <h3><FiTool className="inline-icon" /> Required Tools &amp; Materials</h3>
          <div className="tools-list">
            {data.tools.map((tool, index) => (
              <span key={index} className="tool-chip">{tool}</span>
            ))}
          </div>
        </div>

        {/* Action Plan */}
        <div className="action-plan-section">
          <h3>{data.actionPlan.length}-Step Action Plan</h3>
          <div className="steps-container">
            {data.actionPlan.map((step, index) => {
              const IconComp = STEP_ICONS[index % STEP_ICONS.length];
              const bullets = step.points?.length
                ? step.points
                : step.instruction
                    .split(/(?<=[.!?])\s+/)
                    .filter(Boolean)
                    .map(s => s.trim());

              return (
                <div key={step.step || index} className="step-card">
                  {/* Card Header */}
                  <div className="step-card-header">
                    <div className="step-badge">
                      <span className="step-label">STEP</span>
                      <span className="step-num">{index + 1}</span>
                    </div>
                    <h4 className="step-title">{step.title}</h4>
                    <div className="step-icon-wrap">
                      <IconComp className="step-icon" />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="step-divider" />

                  {/* Bullet Points */}
                  <ul className="step-bullets">
                    {bullets.map((point, pi) => (
                      <li key={pi}>{point}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
