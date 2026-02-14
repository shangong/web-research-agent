import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Agent Terminal</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm custom-scrollbar space-y-3"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for input...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="animate-fade-in">
            <div className="flex gap-3 text-xs text-gray-500 mb-1">
              <span>{log.timestamp.toLocaleTimeString()}</span>
              <span className="text-blue-500 font-bold">[{log.step}]</span>
            </div>
            <div className="text-gray-300 pl-4 border-l-2 border-gray-800">
              {log.message}
            </div>
            {log.details && (
              <pre className="mt-2 ml-4 text-xs text-gray-500 whitespace-pre-wrap bg-gray-900/50 p-2 rounded border border-gray-800/50">
                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};