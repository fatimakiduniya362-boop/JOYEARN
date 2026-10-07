import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, Sparkles, Building, ChevronRight } from 'lucide-react';
import { SponsoredTask } from '../types';

interface TasksModalProps {
  tasks: SponsoredTask[];
  onCompleteTask: (taskId: string) => void;
  onClose: () => void;
  seniorMode: boolean;
}

export const TasksModal: React.FC<TasksModalProps> = ({
  tasks,
  onCompleteTask,
  onClose,
  seniorMode,
}) => {
  const [selectedTask, setSelectedTask] = useState<SponsoredTask | null>(null);
  const [inProgress, setInProgress] = useState(false);

  const handleStartTask = (task: SponsoredTask) => {
    setSelectedTask(task);
  };

  const handleConfirmTask = () => {
    if (!selectedTask) return;
    setInProgress(true);
    setTimeout(() => {
      onCompleteTask(selectedTask.id);
      setInProgress(false);
      setSelectedTask(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-amber-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
              📝
            </div>
            <div>
              <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                Verified Tasks
              </h2>
              <p className="text-xs text-amber-100">Approved campaigns & community pledges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Guarantee Banner */}
        <div className="bg-amber-50 p-3 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Strict Anti-Scam: No paid app installs, fake clicks or pyramid activities.</span>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                task.completed
                  ? 'bg-emerald-50/60 border-emerald-200 opacity-80'
                  : 'bg-white border-gray-200 hover:border-amber-400 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                  {task.category}
                </span>
                <span className="font-extrabold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  +{task.points} Pts
                </span>
              </div>

              <h4 className="font-bold text-gray-900 text-sm mt-2">{task.title}</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{task.requirements}</p>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-gray-400" /> {task.estTime} • By {task.sponsorName}
                </span>

                {task.completed ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                ) : (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl tap-bounce text-xs flex items-center gap-1"
                  >
                    <span>Start Task</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Task Action Modal */}
        {selectedTask && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 w-full max-w-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl">
                ✨
              </div>
              <h4 className="font-bold text-gray-900 text-sm text-center">{selectedTask.title}</h4>
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                {selectedTask.requirements}
              </p>

              <div className="bg-amber-50 p-2.5 rounded-xl text-center text-xs text-amber-900 font-medium">
                Reward: <strong>+{selectedTask.points} JoyPoints</strong> (In-App Perk Currency)
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedTask(null)}
                  disabled={inProgress}
                  className="flex-1 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTask}
                  disabled={inProgress}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold tap-bounce"
                >
                  {inProgress ? 'Verifying...' : 'Complete & Earn'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
