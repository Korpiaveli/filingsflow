'use client'

import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

interface AnimatedDashboardProps {
  greeting: ReactNode
  heroSignal: ReactNode
  watchlistPulse: ReactNode
  activityFeed: ReactNode
  congressCard: ReactNode
  institutionalCard: ReactNode
}

export function AnimatedDashboard({
  greeting,
  heroSignal,
  watchlistPulse,
  activityFeed,
  congressCard,
  institutionalCard,
}: AnimatedDashboardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="mb-8">
        {greeting}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          {heroSignal}
        </div>
        <div>
          {watchlistPulse}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {activityFeed}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {congressCard}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {institutionalCard}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
