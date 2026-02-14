import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ResearchReport } from '../types';
import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';

interface MarkdownReportProps {
  report: ResearchReport | null;
  onFollowUp?: (query: string) => void;
  onStop?: () => void;
  isProcessing?: boolean;
}

export const MarkdownReport: React.FC<MarkdownReportProps> = ({ report, onFollowUp, onStop, isProcessing }) => {
  const [followUpQuery, setFollowUpQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when report updates (e.g. follow-up answer added)
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [report?.markdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpQuery.trim() && onFollowUp && !isProcessing) {
      onFollowUp(followUpQuery);
      setFollowUpQuery('');
    }
  };

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg p-12">
        <p>Report will appear here upon completion.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col relative">
      <div className="p-6 border-b border-gray-800 bg-gray-850 flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Research Report</h2>
          <p className="text-sm text-gray-400">Topic: {report.topic}</p>
        </div>
        {report.score && (
          <div className={`px-3 py-1 rounded-full border ${
            report.score >= 4 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          } text-sm font-bold flex items-center gap-2`}>
            <span>Grade: {report.score}/5</span>
          </div>
        )}
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 pb-32 custom-scrollbar bg-gray-900 scroll-smooth"
      >
        <div className="markdown-body max-w-none">
          <ReactMarkdown>{report.markdown}</ReactMarkdown>
        </div>

        {report.sources.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-800">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Sources Cited</h3>
            <ul className="space-y-2">
              {report.sources.map((source, idx) => (
                <li key={idx} className="flex gap-2 items-start text-sm">
                  <span className="text-gray-500 select-none">[{idx + 1}]</span>
                  <a 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 truncate hover:underline"
                  >
                    {source.title || source.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Follow-up Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="relative flex gap-2">
          <input
            type="text"
            value={followUpQuery}
            onChange={(e) => setFollowUpQuery(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600 shadow-inner"
            disabled={isProcessing}
          />
          <button
            type={isProcessing ? "button" : "submit"}
            onClick={isProcessing ? onStop : undefined}
            disabled={!isProcessing && !followUpQuery.trim()}
            className={`
              px-4 rounded-lg flex items-center justify-center transition-all
              ${(!isProcessing && !followUpQuery.trim())
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : isProcessing 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'}
            `}
          >
            {isProcessing ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};