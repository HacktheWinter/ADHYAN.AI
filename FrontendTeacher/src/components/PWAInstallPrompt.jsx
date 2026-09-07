import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);

      // Check logic to show randomly
      const isDismissed = localStorage.getItem('pwaPromptDismissed');
      const lastShown = localStorage.getItem('pwaPromptLastShown');
      const now = Date.now();

      // Don't show if permanently dismissed
      if (isDismissed === 'true') return;

      // Don't show if shown in the last 12 hours (43200000 ms)
      if (lastShown && now - parseInt(lastShown) < 43200000) return;

      // 30% chance to show the prompt when they open the dashboard
      if (Math.random() < 0.3) {
        setShowPrompt(true);
        localStorage.setItem('pwaPromptLastShown', now.toString());
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Dismiss permanently or for a long time
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-4 relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Download size={24} />
              </div>
              
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  Install ADHYAN.AI
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Install this app on your device for a faster, app-like experience.
                </p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={handleInstallClick}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Install App
                  </button>
                  <button 
                    onClick={handleDismiss}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
