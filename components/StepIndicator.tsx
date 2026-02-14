import React from 'react';
import { AgentState } from '../types';
import { 
  LightBulbIcon, 
  MagnifyingGlassIcon, 
  DocumentTextIcon, 
  ClipboardDocumentCheckIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface StepIndicatorProps {
  currentState: AgentState;
}

const steps = [
  { id: AgentState.BRAINSTORMING, label: 'Brainstorm', icon: LightBulbIcon },
  { id: AgentState.REFLECTING, label: 'Reflect', icon: CpuChipIcon },
  { id: AgentState.SEARCHING, label: 'Search', icon: MagnifyingGlassIcon },
  { id: AgentState.COMPILING, label: 'Compile', icon: DocumentTextIcon },
  { id: AgentState.REVIEWING, label: 'Review', icon: ClipboardDocumentCheckIcon },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentState }) => {
  const isComplete = currentState === AgentState.COMPLETED;
  const isError = currentState === AgentState.ERROR;
  const isRewriting = currentState === AgentState.REWRITING;

  const getStepStatus = (stepId: AgentState) => {
    if (isComplete) return 'completed';
    if (isError) return 'inactive'; // simplify for error
    
    const stepOrder = steps.findIndex(s => s.id === stepId);
    const currentOrder = steps.findIndex(s => s.id === currentState);
    
    // Handle rewriting case - it maps roughly to Compiling/Reviewing loop but let's just show active
    if (isRewriting && (stepId === AgentState.COMPILING || stepId === AgentState.REVIEWING)) {
        return 'active';
    }

    if (currentOrder === -1 && !isRewriting) return 'inactive'; // IDLE
    if (currentOrder === stepOrder) return 'active';
    if (currentOrder > stepOrder) return 'completed';
    return 'inactive';
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-800 -z-10 rounded"></div>
        <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-500 -z-10 transition-all duration-500 rounded"
            style={{ 
                width: isComplete ? '100%' : `${Math.max(0, (steps.findIndex(s => s.id === currentState) / (steps.length - 1)) * 100)}%` 
            }}
        ></div>

        {steps.map((step) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex flex-col items-center group">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-gray-900
                  ${status === 'active' ? 'border-blue-400 text-blue-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-110' : ''}
                  ${status === 'completed' ? 'border-green-500 text-green-500 bg-gray-900' : ''}
                  ${status === 'inactive' ? 'border-gray-700 text-gray-600' : ''}
                `}
              >
                {status === 'completed' ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                    isRewriting && step.id === AgentState.COMPILING && status === 'active' ? 
                    <ArrowPathIcon className="w-5 h-5 animate-spin" /> :
                    <Icon className={`w-5 h-5 ${status === 'active' ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium transition-colors duration-300
                ${status === 'active' ? 'text-blue-400' : ''}
                ${status === 'completed' ? 'text-green-500' : ''}
                ${status === 'inactive' ? 'text-gray-500' : ''}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {isRewriting && (
        <div className="text-center mt-4 text-amber-400 text-sm flex items-center justify-center gap-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span>Rewriting based on feedback...</span>
        </div>
      )}
    </div>
  );
};