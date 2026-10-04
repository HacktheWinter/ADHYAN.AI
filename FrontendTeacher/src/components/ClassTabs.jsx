// FrontendTeacher/src/components/ClassTabs.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, BookOpen, Users } from 'lucide-react';

const ClassTabs = ({ activeTab, classId }) => {
  const navigate = useNavigate();

  const tabs = [
    { id: 'stream', label: 'Stream', icon: Megaphone },
    { id: 'classwork', label: 'Classwork', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
  ];

  const handleTabClick = (tabId) => {
    navigate(`/class/${classId}/${tabId}`);
  };

  return (
    <div className="border-b border-line mt-4">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-[15px] font-medium transition-all whitespace-nowrap cursor-pointer
                ${isActive
                  ? 'text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-ink-soft hover:text-ink hover:bg-paper/60'
                }
              `}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`} />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-600 dark:bg-violet-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ClassTabs;