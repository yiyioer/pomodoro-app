import { useEffect, useState } from 'react'
import PomodoroTimer from './components/PomodoroTimer'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div
      className={`h-full w-full rounded-3xl overflow-hidden select-none ${
        darkMode
          ? 'bg-[#1c1c1e]/70 text-white'
          : 'bg-white/60 text-gray-900'
      }`}
      style={{
        backdropFilter: 'blur(50px) saturate(180%)',
        WebkitBackdropFilter: 'blur(50px) saturate(180%)',
      }}
    >
      <PomodoroTimer darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
    </div>
  )
}
