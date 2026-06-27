import { useEffect, useRef } from 'react'
import type { BattleTimelineEvent } from '../../types/battle'

type BattleTimelineProps = {
  events: BattleTimelineEvent[]
}

export function BattleTimeline({ events }: BattleTimelineProps) {
  const timelineRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    const timelineElement = timelineRef.current

    if (!timelineElement) {
      return
    }

    timelineElement.scrollTop = timelineElement.scrollHeight
  }, [events])

  if (events.length === 0) {
    return null
  }

  return (
    <aside className="battle-timeline battle-window" aria-label="Battle Timeline">
      <ol ref={timelineRef}>
        {events.map((event) => (
          <li key={event.id}>{event.message}</li>
        ))}
      </ol>
    </aside>
  )
}
