import { useReducer, useCallback, useRef, useEffect } from 'react'

export type SessionType = 'focus' | 'shortBreak' | 'longBreak'

export interface TimerState {
  status: 'idle' | 'running' | 'paused'
  session: SessionType
  remainingSeconds: number
  totalSeconds: number
  sessionsCompleted: number
}

type TimerAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'CHANGE_SESSION'; session: SessionType }
  | { type: 'COMPLETE' }

const DURATIONS: Record<SessionType, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

function getInitialState(session: SessionType = 'focus'): TimerState {
  return {
    status: 'idle',
    session,
    remainingSeconds: DURATIONS[session],
    totalSeconds: DURATIONS[session],
    sessionsCompleted: 0,
  }
}

function getNextSession(current: SessionType, sessionsCompleted: number): SessionType {
  if (current === 'focus') {
    return sessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak'
  }
  return 'focus'
}

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      if (state.status === 'running') return state
      return { ...state, status: 'running' }

    case 'PAUSE':
      if (state.status !== 'running') return state
      return { ...state, status: 'paused' }

    case 'RESET':
      return {
        ...state,
        status: 'idle',
        remainingSeconds: DURATIONS[state.session],
        totalSeconds: DURATIONS[state.session],
      }

    case 'TICK':
      if (state.status !== 'running') return state
      if (state.remainingSeconds <= 1) {
        const next = getNextSession(state.session, state.sessionsCompleted + 1)
        return {
          ...state,
          status: 'idle',
          session: next,
          remainingSeconds: DURATIONS[next],
          totalSeconds: DURATIONS[next],
          sessionsCompleted:
            state.session === 'focus' ? state.sessionsCompleted + 1 : state.sessionsCompleted,
        }
      }
      return { ...state, remainingSeconds: state.remainingSeconds - 1 }

    case 'CHANGE_SESSION':
      if (action.session === state.session) return state
      return {
        ...state,
        status: 'idle',
        session: action.session,
        remainingSeconds: DURATIONS[action.session],
        totalSeconds: DURATIONS[action.session],
      }

    case 'COMPLETE':
      const nextSession = getNextSession(state.session, state.sessionsCompleted + 1)
      return {
        ...state,
        status: 'idle',
        session: nextSession,
        remainingSeconds: DURATIONS[nextSession],
        totalSeconds: DURATIONS[nextSession],
        sessionsCompleted:
          state.session === 'focus' ? state.sessionsCompleted + 1 : state.sessionsCompleted,
      }

    default:
      return state
  }
}

export function useTimer(initialSession?: SessionType) {
  const [state, dispatch] = useReducer(timerReducer, initialSession, getInitialState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Manage tick interval based on running state
  useEffect(() => {
    if (state.status === 'running') {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [state.status])

  const start = useCallback(() => dispatch({ type: 'START' }), [])
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const changeSession = useCallback((session: SessionType) => dispatch({ type: 'CHANGE_SESSION', session }), [])

  const progress = state.totalSeconds > 0
    ? ((state.totalSeconds - state.remainingSeconds) / state.totalSeconds)
    : 0

  const minutes = Math.floor(state.remainingSeconds / 60)
  const seconds = state.remainingSeconds % 60
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    state,
    progress,
    timeString,
    minutes,
    seconds,
    start,
    pause,
    reset,
    changeSession,
  }
}
