import React from 'react';
import { motion } from 'framer-motion';

const FloatingBadge = ({
  children,
  className = '',
  yAmplitude = 6,
  yDuration = 3.5,
  xAmplitude = 2,
  xDuration = 4.2,
  delay = 0,
  initialScale = 0.9,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={`relative ${className}`}
      {...props}
    >
      <motion.div
        animate={{
          y: [-yAmplitude, yAmplitude, -yAmplitude],
          x: [-xAmplitude, xAmplitude, -xAmplitude]
        }}
        transition={{
          y: {
            duration: yDuration,
            repeat: Infinity,
            ease: 'easeInOut'
          },
          x: {
            duration: xDuration,
            repeat: Infinity,
            ease: 'easeInOut'
          }
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default FloatingBadge;
