import React, { useState, useMemo } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { Alert } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { ClockIcon, ChartBarIcon } from '../constants';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow flex items-center border border-slate-200 dark:border-slate-700">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const ReportsTab: React.FC = () => {
    const { alerts, loadingAlerts } = useAlerts();
    const { buttonConfigs, loadingConfigs } = useAlertConfig();

    // Fecha local YYYY-MM-DD: toISOString() es UTC y en turnos nocturnos
    // desplazaba el rango un día.
    const localDateString = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const [startDate, setStartDate] = useState(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return localDateString(oneWeekAgo);
    });
    const [endDate, setEndDate] = useState(() => localDateString(new Date()));
    const [alertType, setAlertType] = useState('all');

    const rangeInvalid = !startDate || !endDate || startDate > endDate;

    const { filteredAlerts, stats } = useMemo(() => {
        // Parsear como hora local, no UTC
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();

        const invalid = !Number.isFinite(start) || !Number.isFinite(end) || start > end;
        const filtered = invalid ? [] : alerts.filter(alert => {
            const dateMatch = alert.timestamp >= start && alert.timestamp <= end;
            const typeMatch = alertType === 'all' || alert.type === alertType;
            return dateMatch && typeMatch;
        });
        
        const alertsWithResponseTime = filtered.filter(a => a.workingTimestamp && a.workingTimestamp >= a.timestamp);
        const totalResponseTime = alertsWithResponseTime.reduce((sum, a) => sum + (a.workingTimestamp! - a.timestamp), 0);
        const avgResponseTime = alertsWithResponseTime.length > 0 ? (totalResponseTime / alertsWithResponseTime.length) / 60000 : 0;

        const alertsWithResolutionTime = filtered.filter(a => a.resolvedTimestamp && a.resolvedTimestamp >= a.timestamp);
        const totalResolutionTime = alertsWithResolutionTime.reduce((sum, a) => sum + (a.resolvedTimestamp! - a.timestamp), 0);
        const avgResolutionTime = alertsWithResolutionTime.length > 0 ? (totalResolutionTime / alertsWithResolutionTime.length) / 60000 : 0;

        return {
            filteredAlerts: filtered.sort((a,b) => b.timestamp - a.timestamp),
            stats: {
                avgResponseTime,
                avgResolutionTime,
                totalAlerts: filtered.length
            }
        };

    }, [alerts, startDate, endDate, alertType]);

    const formatMinutes = (minutes: number): string => {
        if (isNaN(minutes)) return 'N/A';
        if (minutes < 1) return '<1m';
        const totalMin = Math.round(minutes);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h > 0 ? `${h}h ` : ''}${m}m`;
    };

    // Fix #24: escapar campos CSV contra inyección y corrupción
    const escapeCSV = (value: any): string => {
        let str = String(value ?? '');
        // Prevenir CSV injection en Excel (=, +, -, @ al inicio)
        if (/^[=+\-@]/.test(str)) str = `'${str}`;
        // Escapar comillas y envolver en comillas si contiene separadores
        if (/[",\n\r]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
        return str;
    };

    const exportToCSV = () => {
        const headers = ['Alert ID', 'Type', 'Press', 'Area', 'Creation Date', 'Response Time (min)', 'Resolution Time (min)', 'Status'];
        const rows = filteredAlerts.map(alert => [
            alert.id,
            alert.type,
            alert.pressName,
            alert.areaName,
            new Date(alert.timestamp).toLocaleString(),
            alert.workingTimestamp ? ((alert.workingTimestamp - alert.timestamp) / 60000).toFixed(2) : 'N/A',
            alert.resolvedTimestamp ? ((alert.resolvedTimestamp - alert.timestamp) / 60000).toFixed(2) : 'N/A',
            alert.status
        ]);

        const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\r\n');

        // Blob + BOM: encodeURI no escapa '#', así que un nombre con '#' cortaba
        // el archivo; sin BOM Excel rompía tildes y eñes.
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `alert_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loadingAlerts || loadingConfigs) {
        return <LoadingSpinner message="Generating report..." />;
    }

    const inputClass = "mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2";

    return (
        <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Alert Timing Report</h2>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass}/>
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass}/>
                </div>
                <div>
                    <label htmlFor="alertType" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alert Type</label>
                    <select id="alertType" value={alertType} onChange={e => setAlertType(e.target.value)} className={inputClass}>
                        <option value="all">All Types</option>
                        {buttonConfigs.map(config => <option key={config.id} value={config.name}>{config.name}</option>)}
                    </select>
                </div>
                 <div className="self-end">
                    <button onClick={exportToCSV} disabled={filteredAlerts.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50">
                        Export CSV
                    </button>
                </div>
            </div>

            {rangeInvalid && (
                <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-medium dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                    El rango de fechas no es válido: la fecha inicial debe ser anterior o igual a la final.
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard title="Avg. Response Time" value={formatMinutes(stats.avgResponseTime)} icon={<ClockIcon className="w-6 h-6" />} />
                <StatCard title="Avg. Resolution Time" value={formatMinutes(stats.avgResolutionTime)} icon={<ClockIcon className="w-6 h-6" />} />
                <StatCard title="Total Alerts" value={stats.totalAlerts.toString()} icon={<ChartBarIcon className="w-6 h-6" />} />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alert Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Press (Area)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Response Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolution Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredAlerts.map(alert => {
                            const responseTime = alert.workingTimestamp ? (alert.workingTimestamp - alert.timestamp) / 60000 : NaN;
                            const resolutionTime = alert.resolvedTimestamp ? (alert.resolvedTimestamp - alert.timestamp) / 60000 : NaN;

                            return (
                                <tr key={alert.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{alert.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{alert.pressName} ({alert.areaName})</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{formatMinutes(responseTime)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{formatMinutes(resolutionTime)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{new Date(alert.timestamp).toLocaleDateString()}</td>
                                </tr>
                            )
                        })}
                         {filteredAlerts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-500 dark:text-slate-400">No alerts found for the selected filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportsTab;