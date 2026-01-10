'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  formatLarge?: boolean
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatLarge = false,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)

  const spring = useSpring(prevValue.current, {
    duration: duration * 1000,
    bounce: 0,
  })

  useEffect(() => {
    spring.set(value)
    prevValue.current = value
  }, [value, spring])

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplayValue(latest)
    })
  }, [spring])

  const formatNumber = (num: number) => {
    if (formatLarge) {
      const abs = Math.abs(num)
      const sign = num < 0 ? '-' : ''
      if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B'
      if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M'
      if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + 'K'
    }
    return num.toFixed(decimals)
  }

  return (
    <span className={className}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  )
}

interface AnimatedPercentageProps {
  value: number
  className?: string
  showSign?: boolean
  duration?: number
}

export function AnimatedPercentage({
  value,
  className,
  showSign = true,
  duration = 0.8,
}: AnimatedPercentageProps) {
  const isPositive = value >= 0
  const sign = showSign ? (isPositive ? '+' : '') : ''

  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      prefix={sign}
      suffix="%"
      decimals={1}
      className={className}
    />
  )
}

interface AnimatedValueProps {
  value: number
  className?: string
  showSign?: boolean
  duration?: number
}

export function AnimatedValue({
  value,
  className,
  showSign = true,
  duration = 0.8,
}: AnimatedValueProps) {
  const isPositive = value >= 0
  const sign = showSign ? (isPositive ? '+' : '-') : ''
  const absValue = Math.abs(value)

  return (
    <AnimatedCounter
      value={absValue}
      duration={duration}
      prefix={sign + '$'}
      formatLarge
      className={className}
    />
  )
}

interface CountUpProps {
  end: number
  start?: number
  duration?: number
  className?: string
  separator?: string
}

export function CountUp({
  end,
  start = 0,
  duration = 2,
  className,
  separator = ',',
}: CountUpProps) {
  const [count, setCount] = useState(start)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / (duration * 1000), 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(start + (end - start) * easeOut))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [end, start, duration])

  const formatted = count.toLocaleString('en-US').replace(/,/g, separator)

  return <span className={className}>{formatted}</span>
}

interface FlipCounterProps {
  value: number
  className?: string
}

export function FlipCounter({ value, className }: FlipCounterProps) {
  const digits = String(value).padStart(3, '0').split('')

  return (
    <div className={`flex gap-0.5 ${className}`}>
      {digits.map((digit, index) => (
        <motion.div
          key={`${index}-${digit}`}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-6 h-8 bg-muted rounded flex items-center justify-center font-mono font-bold"
        >
          {digit}
        </motion.div>
      ))}
    </div>
  )
}
