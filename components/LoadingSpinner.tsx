import React from 'react';

const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg', message?: string }> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-12 w-12 border-t-4',
    lg: 'h-16 w-16 border-t-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-primary-600 border-solid`}></div>
      {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;