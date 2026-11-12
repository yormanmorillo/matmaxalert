import React from 'react';

interface PanelHeaderProps {
  icon: React.ReactNode;
  iconClassName: string; // background + text color classes for the icon container
  title: string;
  subtitle: string;
  children?: React.ReactNode; // right-side action buttons
}

/**
 * Standardized header for operational panels (Driver, Technical, Press).
 * Same sizes, spacing and typography on every screen.
 */
const PanelHeader: React.FC<PanelHeaderProps> = ({ icon, iconClassName, title, subtitle, children }) => (
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-5">
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClassName}`}>
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
    {children && (
      <div className="flex gap-2 self-end sm:self-auto">
        {children}
      </div>
    )}
  </header>
);

export default PanelHeader;
