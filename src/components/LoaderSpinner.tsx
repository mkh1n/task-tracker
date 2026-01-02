'use client';

import { Oval } from 'react-loader-spinner';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingSpinnerProps {
  visible?: boolean;
  size?: number;
  color?: string;
  secondaryColor?: string;
}

export default function LoadingSpinner({
  visible = true,
  size = 80,
  color = "#ffff",
  secondaryColor = "#ffff",
}: LoadingSpinnerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.2,
              delay: 0.1 
            }}
          >
            <Oval
              height={size}
              width={size}
              color={color}
              secondaryColor={secondaryColor}
              visible={true}
              ariaLabel="oval-loading"
              strokeWidth={2}
              strokeWidthSecondary={2}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}