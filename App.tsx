import React, { useState, useRef, useEffect } from 'react';
import { AgentState, LogEntry, ResearchReport, SearchQuery } from './types';
import { StepIndicator } from './components/StepIndicator';
import { LogViewer } from './components/LogViewer';
import { MarkdownReport } from './components/MarkdownReport';
import { brainstormQueries, reflectAndRefineQueries, searchAndCompile, reviewReport, askFollowUp } from './services/geminiService';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';

const MAX_RETRIES = 2;

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [state, setState] = useState<AgentState>(AgentState.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = (step: AgentState, message: string, details?: any) => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      step,
      message,
      details
    }]);
  };

  const handleError = (error: any) => {
    if (error.message === 'Aborted' || error.name === 'AbortError') {
      addLog(AgentState.IDLE, 'Research stopped by user.');
      setState(AgentState.IDLE);
      return;
    }
    console.error(error);
    setState(AgentState.ERROR);
    addLog(AgentState.ERROR, 'An error occurred', error.message || String(error));
  };

  const stopResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const startResearch = async () => {
    if (!topic.trim()) return;

    // Reset
    stopResearch();
    const ac = new AbortController();
    abortControllerRef.current = ac;
    const signal = ac.signal;

    setState(AgentState.BRAINSTORMING);
    setLogs([]);
    setReport(null);
    setQueries([]);
    retryCountRef.current = 0;
    
    addLog(AgentState.IDLE, `Starting research on: "${topic}"`);

    try {
      // Step 1: Brainstorm
      if (signal.aborted) throw new Error('Aborted');
      addLog(AgentState.BRAINSTORMING, 'Brainstorming search queries...');
      const initialQueries = await brainstormQueries(topic);
      if (signal.aborted) throw new Error('Aborted');
      addLog(AgentState.BRAINSTORMING, `Generated ${initialQueries.length} initial queries`, initialQueries);

      // Step 2: Reflect
      setState(AgentState.REFLECTING);
      addLog(AgentState.REFLECTING, 'Reflecting and refining queries...');
      const refinedQueries = await reflectAndRefineQueries(initialQueries);
      if (signal.aborted) throw new Error('Aborted');
      setQueries(refinedQueries);
      addLog(AgentState.REFLECTING, `Selected top ${refinedQueries.length} queries`, refinedQueries);

      // Step 3 & 4: Search & Compile (Initial)
      await runSearchAndCompileLoop(topic, refinedQueries, undefined, undefined, signal);

    } catch (error) {
      handleError(error);
    }
  };

  const runSearchAndCompileLoop = async (
    currentTopic: string, 
    currentQueries: SearchQuery[], 
    feedback?: string, 
    previousReportMarkdown?: string,
    signal?: AbortSignal
  ) => {
    if (signal?.aborted) throw new Error('Aborted');

    const isRetry = !!feedback;
    setState(isRetry ? AgentState.REWRITING : AgentState.SEARCHING);
    
    if (isRetry) {
        addLog(AgentState.REWRITING, `Rewriting report (Attempt ${retryCountRef.current}/${MAX_RETRIES})...`, { feedback });
    } else {
        addLog(AgentState.SEARCHING, 'Searching web (via Google Grounding) and compiling report...');
    }

    // Combine Searching and Compiling for UI simplicity since Gemini does both in one shot with Tools
    if (!isRetry) setState(AgentState.COMPILING);

    const { markdown, sources } = await searchAndCompile(currentTopic, currentQueries, feedback, previousReportMarkdown);
    if (signal?.aborted) throw new Error('Aborted');
    
    addLog(AgentState.COMPILING, 'Report compiled. Sources found:', sources.length);
    
    const tempReport: ResearchReport = {
        topic: currentTopic,
        markdown,
        sources,
        version: retryCountRef.current + 1
    };
    setReport(tempReport);

    // Step 5: Review
    setState(AgentState.REVIEWING);
    addLog(AgentState.REVIEWING, 'Sending report to reviewer agent...');
    
    const review = await reviewReport(currentTopic, markdown);
    if (signal?.aborted) throw new Error('Aborted');
    addLog(AgentState.REVIEWING, `Review Complete. Score: ${review.score}/5`, review.feedback);

    // Update report with score
    const scoredReport = { ...tempReport, score: review.score, feedback: review.feedback };
    setReport(scoredReport);

    if (review.score < 4 && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      addLog(AgentState.REVIEWING, `Score too low (<4). Initiating rewrite loop.`);
      // Loop back
      await runSearchAndCompileLoop(currentTopic, currentQueries, review.feedback, markdown, signal);
    } else {
      if (review.score < 4) {
        addLog(AgentState.COMPLETED, 'Max retries reached. Finalizing report despite low score.');
      } else {
        addLog(AgentState.COMPLETED, 'Report approved! Research complete.');
      }
      setState(AgentState.COMPLETED);
    }
  };

  const handleFollowUp = async (query: string) => {
    if (!report) return;

    // Reset controller
    stopResearch();
    const ac = new AbortController();
    abortControllerRef.current = ac;
    const signal = ac.signal;

    // Use SEARCHING state to show activity, but logs will indicate it's a follow-up
    setState(AgentState.SEARCHING);
    addLog(AgentState.SEARCHING, `Processing follow-up question: "${query}"`);

    try {
      const { answer, sources } = await askFollowUp(report.topic, report.markdown, query, signal);
      
      const newMarkdown = `${report.markdown}\n\n---\n\n### Follow-up: ${query}\n\n${answer}`;
      
      // Merge unique sources
      const existingUris = new Set(report.sources.map(s => s.uri));
      const newUniqueSources = sources.filter(s => !existingUris.has(s.uri));
      const updatedSources = [...report.sources, ...newUniqueSources];

      setReport({
        ...report,
        markdown: newMarkdown,
        sources: updatedSources
      });

      addLog(AgentState.COMPLETED, 'Follow-up answer added to report.', { newSourcesFound: newUniqueSources.length });
      setState(AgentState.COMPLETED);

    } catch (error: any) {
      if (error.message === 'Aborted' || error.name === 'AbortError') {
        addLog(AgentState.COMPLETED, 'Follow-up stopped by user.');
        setState(AgentState.COMPLETED); // Revert to completed state to keep report visible
      } else {
        handleError(error);
        setState(AgentState.COMPLETED); // Revert to completed state on error too
      }
    }
  };

  const isRunning = state !== AgentState.IDLE && state !== AgentState.COMPLETED && state !== AgentState.ERROR;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="font-bold text-white text-lg">G</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">Gemini Research Agent</h1>
            </div>
            <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                SYSTEM ONLINE
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Logs */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-[calc(100vh-8rem)]">
          {/* Input Section */}
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-xl">
            <label className="block text-sm font-medium text-slate-400 mb-2">Research Topic</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The future of solid state batteries"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                disabled={isRunning}
                onKeyDown={(e) => e.key === 'Enter' && !isRunning && startResearch()}
              />
              {isRunning ? (
                 <button
                 onClick={stopResearch}
                 className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 active:scale-95"
               >
                 <StopIcon className="w-5 h-5" />
                 Stop
               </button>
              ) : (
                <button
                  onClick={startResearch}
                  disabled={!topic.trim()}
                  className={`
                    px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all
                    ${!topic.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'}
                  `}
                >
                  <PlayIcon className="w-5 h-5" />
                  Start
                </button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-xl">
             <StepIndicator currentState={state} />
          </div>

          {/* Logs Section */}
          <div className="flex-1 min-h-0">
             <LogViewer logs={logs} />
          </div>
        </div>

        {/* Right Column: Report Viewer */}
        <div className="lg:col-span-7 h-[calc(100vh-8rem)]">
            <MarkdownReport 
              report={report} 
              onFollowUp={handleFollowUp}
              onStop={stopResearch}
              isProcessing={state === AgentState.SEARCHING && logs[logs.length-1]?.message?.includes('follow-up')}
            />
        </div>
      </main>
    </div>
  );
};

export default App;