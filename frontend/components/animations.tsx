'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

// Fade in from below - for page content
export function FadeIn({ 
  children, 
  delay = 0,
  className = '' 
}: { 
  children: ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger children - for lists and grids
// IMPORTANT: uses style fallback so content is ALWAYS visible even if animation fails
export function Stagger({ 
  children, 
  className = '',
  staggerDelay = 0.04 
}: { 
  children: ReactNode; 
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
      style={{ opacity: 1 }} // fallback: always visible
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 4 },
        visible: { 
          opacity: 1, 
          y: 0, 
          transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } 
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page wrapper with fade transition
export function PageTransition({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
