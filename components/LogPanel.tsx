import React from 'react';
import { LogEntry } from '../types';
import { XMarkIcon } from './IconComponents';

interface LogPanelProps {
    logs: LogEntry[];
    isOpen: boolean;
    onClose: () => void;
}

const LogDetail: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
        <div className="mt-2 text-gray-300">{children}</div>
    </div>
);

export const LogPanel: React.FC<LogPanelProps> = ({ logs, isOpen, onClose }) => {
    return (
        <div
            className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
            
            {/* Panel */}
            <div
                className={`absolute inset-y-0 right-0 w-full max-w-2xl bg-gray-800 border-l border-gray-700 shadow-xl transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-cyan-400">Process Log</h2>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-6">
                        {logs.map((log) => (
                            <details key={log.step} className="bg-gray-900/50 border border-gray-700 rounded-lg" open>
                                <summary className="p-4 cursor-pointer text-lg font-semibold text-white flex justify-between items-center">
                                    <span>Step {log.step}: {log.title}</span>
                                    <span className="text-xs px-2 py-1 bg-cyan-900/50 text-cyan-300 rounded-full">{log.model}</span>
                                </summary>
                                <div className="p-4 border-t border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Input Column */}
                                        <div className="bg-gray-800/60 p-4 rounded-md">
                                            <h3 className="text-base font-bold text-cyan-400 border-b border-cyan-800 pb-2 mb-2">INPUT</h3>
                                            <LogDetail title="Prompt">
                                                <pre className="text-xs whitespace-pre-wrap bg-gray-900 p-3 rounded-md font-mono">{log.input.prompt.trim()}</pre>
                                            </LogDetail>
                                            {log.input.images && log.input.images.length > 0 && (
                                                <LogDetail title="Images">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {log.input.images.map((img, index) => (
                                                            <div key={index}>
                                                                <img src={img.base64} alt={img.label} className="w-full h-auto object-cover rounded-md border-2 border-gray-600"/>
                                                                <p className="text-xs text-center text-gray-400 mt-1">{img.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </LogDetail>
                                            )}
                                        </div>

                                        {/* Output Column */}
                                        <div className="bg-gray-800/60 p-4 rounded-md">
                                            <h3 className="text-base font-bold text-green-400 border-b border-green-800 pb-2 mb-2">OUTPUT</h3>
                                             {log.output.text && (
                                                <LogDetail title="Text Response">
                                                    <blockquote className="text-sm italic border-l-4 border-gray-600 pl-3 py-1 bg-gray-900/50 rounded-r-md">
                                                        {log.output.text}
                                                    </blockquote>
                                                </LogDetail>
                                            )}
                                            {log.output.image && (
                                                <LogDetail title="Generated Image">
                                                     <img src={log.output.image} alt="Generated output" className="w-full h-auto object-cover rounded-md border-2 border-gray-600"/>
                                                </LogDetail>
                                            )}
                                            {!log.output.text && !log.output.image && (
                                                <p className="text-sm text-gray-500">No output was generated in this step.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
