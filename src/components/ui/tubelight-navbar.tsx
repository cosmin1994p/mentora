"use client"

import React, { useEffect, useState } from "react"
import { motion } from "motion/react"
import { LucideIcon } from "lucide-react"

interface NavItem {
  name: string
  value: string
  icon?: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  activeTab: string
  onTabChange: (value: string) => void
  className?: string
}

export function NavBar({ items, activeTab, onTabChange, className }: NavBarProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className={className}>
      <div className="flex items-center gap-3 bg-[#002147]/20 border border-white/10 backdrop-blur-lg py-1.5 px-1.5 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.value

          return (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={`relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-5 lg:px-6 ${
                isActive 
                  ? 'bg-white/10 text-[#FF5530]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="hidden md:inline">{item.name}</span>
              {Icon && (
                <span className="md:hidden">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-[#FF5530]/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  {/* Tubelight glow effect - TOP */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#FF5530] rounded-t-full">
                    <div className="absolute w-12 h-6 bg-[#FF5530]/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-[#FF5530]/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-[#FF5530]/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}