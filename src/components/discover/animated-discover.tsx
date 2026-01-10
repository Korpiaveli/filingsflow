'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type ReactNode } from 'react'

interface AnimatedDiscoverProps {
  header: ReactNode
  tabs: ReactNode
  content: ReactNode
  tabKey: string
}

export function AnimatedDiscover({ header, tabs, content, tabKey }: AnimatedDiscoverProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
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
        className="mb-8"
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
        {tabs}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tabKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
