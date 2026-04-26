import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-[260px] transition-[padding] duration-300 min-w-0">
        <div className="p-4 sm:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
