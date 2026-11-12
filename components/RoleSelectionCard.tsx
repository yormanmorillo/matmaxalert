import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

interface RoleSelectionCardProps {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const RoleSelectionCard: React.FC<RoleSelectionCardProps> = ({ to, title, description, icon, requiresAuth }) => {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all"
    >
      <div className="flex-shrink-0 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {description}
        </p>
      </div>

      <div className="flex-shrink-0">
        {requiresAuth ? (
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Link>
  );
};

export default RoleSelectionCard;