import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimer, type SessionType } from '../hooks/useTimer'

interface Props {
  darkMode: boolean
  onToggleDark: () => void
}

const SESSIONS: { key: SessionType; label: string }[] = [
  { key: 'focus', label: '专注' },
  { key: 'shortBreak', label: '短休' },
  { key: 'longBreak', label: '长休' },
]

const CIRCLE_R = 140
const CIRCLE_C = 2 * Math.PI * CIRCLE_R

const spring = { type: 'spring' as const, stiffness: 250, damping: 25 }
const gentle = { type: 'spring' as const, stiffness: 100, damping: 18 }
const STORAGE_KEY = 'pomodoro-durations'

function loadDurations(): Record<SessionType, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        typeof parsed.focus === 'number' && parsed.focus > 0 &&
        typeof parsed.shortBreak === 'number' && parsed.shortBreak > 0 &&
        typeof parsed.longBreak === 'number' && parsed.longBreak > 0
      ) {
        return parsed
      }
    }
  } catch { /* fall through to defaults */ }
  return { focus: 25, shortBreak: 5, longBreak: 15 }
}

export default function PomodoroTimer({ darkMode, onToggleDark }: Props) {
  const [durations, setDurationsState] = useState<Record<SessionType, number>>(loadDurations)
  const durationsInSeconds: Record<SessionType, number> = {
    focus: durations.focus * 60,
    shortBreak: durations.shortBreak * 60,
    longBreak: durations.longBreak * 60,
  }

  const { state, progress, timeString, minutes, seconds, start, pause, reset, changeSession, setDurations } =
    useTimer('focus', durationsInSeconds)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'
  const strokeOffset = CIRCLE_C * (1 - progress)

  // Update tray timer text
  useEffect(() => {
    if (window.electronAPI) {
      const icon = isRunning ? '▶ ' : isPaused ? '⏸ ' : ''
      window.electronAPI.updateTrayTimer(`${icon}${timeString}`)
    }
  }, [timeString, isRunning, isPaused])

  // Show completion animation
  useEffect(() => {
    if (progress >= 1 && state.status === 'idle') {
      setShowComplete(true)
      const t = setTimeout(() => setShowComplete(false), 2000)
      if (window.electronAPI) {
        window.electronAPI.updateTrayTimer('✓ 完成！')
      }
      return () => clearTimeout(t)
    }
  }, [progress, state.status])

  // Persist durations to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(durations))
  }, [durations])

  // Adjust window size when settings toggles
  useEffect(() => {
    if (window.electronAPI) {
      if (showSettings) {
        window.electronAPI.setMinSize(400, 610)
        window.electronAPI.expandWindow()
      } else {
        window.electronAPI.setMinSize(400, 500)
        window.electronAPI.shrinkWindow()
      }
    }
  }, [showSettings])

  const handleToggleAlwaysOnTop = useCallback(async () => {
    if (window.electronAPI) {
      const newVal = await window.electronAPI.toggleAlwaysOnTop(!alwaysOnTop)
      setAlwaysOnTop(newVal)
    } else {
      setAlwaysOnTop((v) => !v)
    }
  }, [alwaysOnTop])

  const handleDurationChange = useCallback(
    (session: SessionType, value: number) => {
      const clamped = Math.max(1, Math.min(120, value))
      const newDurations = { ...durations, [session]: clamped }
      setDurationsState(newDurations)
      setDurations({
        focus: newDurations.focus * 60,
        shortBreak: newDurations.shortBreak * 60,
        longBreak: newDurations.longBreak * 60,
      })
    },
    [durations, setDurations]
  )

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow()
  }

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow()
  }

  const handleQuit = () => {
    if (window.electronAPI) window.electronAPI.quitApp()
  }

  const textColor = darkMode ? 'text-white' : 'text-gray-800'
  const subColor = darkMode ? 'text-white/50' : 'text-gray-500'
  const ringTrack = darkMode ? 'stroke-white/[0.08]' : 'stroke-gray-300/60'
  const ringFill = darkMode ? 'stroke-white' : 'stroke-gray-800'
  const btnBg = darkMode ? 'bg-white/[0.08]' : 'bg-gray-200/70'
  const btnHover = darkMode ? 'hover:bg-white/[0.14]' : 'hover:bg-gray-300/80'
  const activeTab = darkMode ? 'bg-white/[0.12]' : 'bg-black/[0.06]'

  return (
    <div className="h-full w-full flex flex-col items-center py-4 px-8 drag-region">
      {/* Top bar: window controls + toggles */}
      <div className="w-full flex items-center justify-between no-drag shrink-0">
        {/* Traffic light buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={handleClose}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors duration-200 active:scale-90"
          />
          <button
            onClick={handleMinimize}
            className="w-3.5 h-3.5 rounded-full bg-[#febc2e] hover:bg-[#f5a623] transition-colors duration-200 active:scale-90"
          />
          <div className="w-3.5 h-3.5 rounded-full bg-[#28c840]/40" />
        </div>

        {/* Right toggles */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleAlwaysOnTop}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${btnBg} ${btnHover} ${textColor} ${
              alwaysOnTop ? (darkMode ? 'bg-white/[0.16]' : 'bg-black/[0.1]') : ''
            }`}
          >
            {alwaysOnTop ? '📌 置顶' : '📌'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleDark}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${btnBg} ${btnHover} ${textColor}`}
          >
            {darkMode ? '☀' : '☾'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowSettings((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${btnBg} ${btnHover} ${textColor} ${
              showSettings ? (darkMode ? 'bg-white/[0.16]' : 'bg-black/[0.1]') : ''
            }`}
          >
            ⚙
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleQuit}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${btnBg} hover:bg-red-500/30 ${textColor}`}
            title="退出程序"
          >
            ✕
          </motion.button>
        </div>
      </div>

      {/* Session selector */}
      <div className="no-drag shrink-0 mt-4">
        <motion.div
          layout
          className={`flex gap-1 p-1 rounded-xl ${btnBg}`}
        >
          {SESSIONS.map((s) => (
            <motion.button
              key={s.key}
              onClick={() => changeSession(s.key)}
              whileTap={{ scale: 0.95 }}
              className={`relative px-4 py-1.5 text-xs font-medium rounded-[10px] transition-colors duration-200 ${
                state.session === s.key
                  ? `${activeTab} ${textColor}`
                  : `${subColor} hover:${textColor}`
              }`}
            >
              {state.session === s.key && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 rounded-[10px] ${activeTab}`}
                  transition={spring}
                />
              )}
              <span className="relative z-10">{s.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className={`no-drag shrink-0 mt-3 mb-1 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-gray-300/60'}`}>
          <div className={`flex gap-3 p-3 rounded-xl ${btnBg}`}>
            {SESSIONS.map(({ key, label }) => (
              <label key={key} className={`flex flex-col items-center gap-1 ${subColor}`}>
                <span className="text-[10px] tracking-wide">{label}</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={durations[key]}
                  onChange={(e) => handleDurationChange(key, parseInt(e.target.value) || 1)}
                  className={`w-12 text-center text-xs font-medium py-1 rounded-lg border-0 outline-none appearance-none ${btnBg} ${textColor}`}
                />
                <span className="text-[9px] opacity-50">分钟</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center shrink-0">

      {/* Ring progress + timer */}
      <div className="relative flex items-center justify-center no-drag mt-2">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {/* Track */}
          <circle
            cx="150"
            cy="150"
            r={CIRCLE_R}
            fill="none"
            strokeWidth="6"
            className={`${ringTrack} transition-colors duration-500`}
          />
          {/* Progress */}
          <motion.circle
            cx="150"
            cy="150"
            r={CIRCLE_R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`${ringFill} transition-colors duration-500`}
            strokeDasharray={CIRCLE_C}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={gentle}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Timer display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${minutes}-${seconds}-${state.status}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="flex flex-col items-center"
            >
              <span
                className={`text-6xl font-extralight tracking-tighter tabular-nums ${textColor}`}
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {String(minutes).padStart(2, '0')}
                <span className="mx-0.5 opacity-40">:</span>
                {String(seconds).padStart(2, '0')}
              </span>
              <span className={`text-xs mt-2 tracking-widest ${subColor}`}>
                {state.session === 'focus' ? '专注中' : '休息中'}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-4 no-drag mt-2">
        {state.status === 'idle' ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={start}
            className={`px-10 py-3 rounded-2xl text-base font-medium tracking-wide transition-all duration-300 ${
              darkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            开始
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={reset}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${btnBg} ${btnHover} ${textColor}`}
            >
              ↺
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={isRunning ? pause : start}
              className={`px-10 py-3 rounded-2xl text-base font-medium tracking-wide transition-all duration-300 ${
                darkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isRunning ? '暂停' : '继续'}
            </motion.button>
          </>
        )}
      </div>

      {/* Sessions count */}
      <div className={`text-xs tracking-wide ${subColor} no-drag mt-3`}>
        已完成 {state.sessionsCompleted} 个番茄
      </div>

      </div>

      {/* Completion toast */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring}
            className={`absolute bottom-20 px-6 py-3 rounded-2xl text-sm font-medium ${
              darkMode ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-800'
            }`}
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            番茄完成！
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
