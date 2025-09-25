import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  inline?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text = 'Loading...',
  inline = false
}) => {
  return (
    <div className={`loading-spinner-container ${inline ? 'inline' : ''}`}>
      <div className={`loading-spinner ${size}`}>
        <div className="spinner"></div>
      </div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;