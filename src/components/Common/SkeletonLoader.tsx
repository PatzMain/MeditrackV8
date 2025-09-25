import React from 'react';
import './LoadingSpinner.css';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '1em',
  borderRadius = '4px',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

// Pre-built skeleton components for common use cases
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <tr>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} style={{ padding: '12px 16px' }}>
        <SkeletonLoader height="20px" />
      </td>
    ))}
  </tr>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="stat-card" style={{ minHeight: '120px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <SkeletonLoader width="48px" height="48px" borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <SkeletonLoader width="80%" height="16px" style={{ marginBottom: '8px' }} />
        <SkeletonLoader width="60%" height="24px" style={{ marginBottom: '4px' }} />
        <SkeletonLoader width="40%" height="14px" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '300px' }) => (
  <div
    style={{
      width: '100%',
      height,
      background: '#f8fafc',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #e5e7eb'
    }}
  >
    <SkeletonLoader width="80%" height="60%" borderRadius="8px" />
  </div>
);

export const FormSkeleton: React.FC<{ fields: number }> = ({ fields }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index}>
        <SkeletonLoader width="30%" height="16px" style={{ marginBottom: '8px' }} />
        <SkeletonLoader width="100%" height="40px" borderRadius="8px" />
      </div>
    ))}
  </div>
);

export const ListItemSkeleton: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
    <SkeletonLoader width="40px" height="40px" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <SkeletonLoader width="70%" height="16px" style={{ marginBottom: '4px' }} />
      <SkeletonLoader width="50%" height="14px" />
    </div>
    <SkeletonLoader width="60px" height="32px" borderRadius="16px" />
  </div>
);

export default SkeletonLoader;