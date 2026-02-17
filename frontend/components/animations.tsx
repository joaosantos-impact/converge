'use client';

import { LazyMotion, domAnimation, m } from 'framer-motion';
import { ReactNode } from 'react';

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
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

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
    <LazyMotion features={domAnimation}>
      <m.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: staggerDelay } },
        }}
        className={className}
        style={{ opacity: 1 }}
      >
        {children}
      </m.div>
    </LazyMotion>
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
    <LazyMotion features={domAnimation}>
      <m.div
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
      </m.div>
    </LazyMotion>
  );
}

export function PageTransition({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
