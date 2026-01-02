'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number; // задержка между детьми
  animateFrom?: 'top' | 'bottom' | 'left' | 'right' | 'fade';
}

export const StaggerContainer = ({
  children,
  className = "",
  staggerDelay = 0.1,
  animateFrom = 'fade',
}: StaggerContainerProps) => {
  // Настройки анимации в зависимости от направления
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay, // дети анимируются по очереди
      },
    },
  };

  // Варианты анимации для детей
  const getChildVariants = () => {
    switch (animateFrom) {
      case 'top':
        return {
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0 },
        };
      case 'bottom':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        };
      case 'left':
        return {
          hidden: { opacity: 0, x: -20 },
          visible: { opacity: 1, x: 0 },
        };
      case 'right':
        return {
          hidden: { opacity: 0, x: 20 },
          visible: { opacity: 1, x: 0 },
        };
      case 'fade':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <motion.div key={index} variants={getChildVariants()}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={getChildVariants()}>{children}</motion.div>
      }
    </motion.div>
  );
};