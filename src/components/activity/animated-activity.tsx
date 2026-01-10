'use client'

import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface AnimatedActivityProps {
  header: ReactNode
  filters: ReactNode
  feed: ReactNode
  pagination: ReactNode
}

export function AnimatedActivity({ header, filters, feed, pagination }: AnimatedActivityProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="space-y-6"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -10 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.4 }}
      >
        {header}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.3 }}
      >
        {filters}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {feed}
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        {pagination}
      </motion.div>
    </motion.div>
  )
}
