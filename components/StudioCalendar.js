'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import { formatDate, localDateKey } from '@/lib/scheduler';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthCells(cursor) {
  const first = startOfMonth(cursor);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function datesInRange(from, to) {
  const days = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor <= end) {
    days.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function StudioCalendar({
  open,
  onClose,
  schedule,
  settings,
  minutesPerSession,
  onToggleDayOff,
  onSetDaysOff,
  onOpenOrder,
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(localDateKey(new Date()));
  const [offMode, setOffMode] = useState(false);
  const today = localDateKey(new Date());
  const sessions = useMemo(() => Object.fromEntries((schedule.sessions || []).map((session) => [session.date, session])), [schedule]);
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const selectedSession = sessions[selected];
  const selectedOff = (settings.daysOff || []).includes(selected);
  const selectedDate = new Date(`${selected}T12:00:00`);
  const selectedIsWork = (settings.workDays || []).includes(selectedDate.getDay()) && !selectedOff;
  const booked = selectedSession ? Number(minutesPerSession) - selectedSession.minutesRemaining : 0;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'o' || event.key === 'O') onToggleDayOff(selected);
      if (event.key === 'm' || event.key === 'M') setOffMode((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onToggleDayOff, selected]);

  if (!open) return null;

  const title = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const handleDay = (key, event) => {
    if (offMode || event.shiftKey || event.altKey) {
      onToggleDayOff(key);
      setSelected(key);
      return;
    }
    setSelected(key);
  };

  const offThisWeek = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const keys = datesInRange(localDateKey(start), localDateKey(end))
      .filter((key) => (settings.workDays || []).includes(new Date(`${key}T12:00:00`).getDay()));
    onSetDaysOff([...new Set([...(settings.daysOff || []), ...keys])]);
  };

  const clearFutureOff = () => {
    onSetDaysOff((settings.daysOff || []).filter((date) => date < today));
  };

  return (
    <div className="cal-overlay" role="dialog" aria-modal="true" aria-labelledby="cal-title">
      <button className="cal-scrim" type="button" aria-label="Close calendar" onClick={onClose} />
      <section className="cal-sheet">
        <header className="cal-head">
          <div>
            <p className="eyebrow">STUDIO CALENDAR</p>
            <h2 id="cal-title">{title}</h2>
          </div>
          <div className="cal-nav">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft /></button>
            <button type="button" onClick={() => setCursor(startOfMonth(new Date()))}>Today</button>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight /></button>
            <button className={`cal-mode${offMode ? ' is-on' : ''}`} type="button" onClick={() => setOffMode((value) => !value)}>
              {offMode ? 'Click days to take off' : 'Mark days off'}
            </button>
            <button className="cal-close" type="button" onClick={onClose} aria-label="Close calendar"><X /></button>
          </div>
        </header>

        <div className="cal-legend">
          <span><i className="swatch work" /> Work night</span>
          <span><i className="swatch booked" /> On the machine</span>
          <span><i className="swatch off" /> Day off</span>
          <span>Shift-click a day to flip off · O toggles selected · M mark-off mode</span>
        </div>

        <div className="cal-weekdays">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="cal-grid">
          {cells.map((date) => {
            const key = localDateKey(date);
            const outside = date.getMonth() !== cursor.getMonth();
            const session = sessions[key];
            const off = (settings.daysOff || []).includes(key);
            const work = (settings.workDays || []).includes(date.getDay()) && !off;
            const jobs = session?.jobs || [];
            const used = session ? Number(minutesPerSession) - session.minutesRemaining : 0;
            const fill = minutesPerSession ? Math.min(100, Math.round((used / Number(minutesPerSession)) * 100)) : 0;
            return (
              <button
                type="button"
                key={key}
                className={`cal-day${outside ? ' is-out' : ''}${key === today ? ' is-today' : ''}${key === selected ? ' is-selected' : ''}${work ? ' is-work' : ''}${off ? ' is-off' : ''}${jobs.length ? ' has-jobs' : ''}`}
                onClick={(event) => handleDay(key, event)}
                onDoubleClick={() => onToggleDayOff(key)}
              >
                <span className="cal-num">{date.getDate()}</span>
                {work && <span className="cal-meter"><b style={{ width: `${fill}%` }} /></span>}
                <span className="cal-jobs">
                  {jobs.slice(0, 3).map((job, index) => (
                    <em key={`${job.orderId}-${index}`} className={job.phase === 'Design' ? 'is-design' : 'is-stitch'}>{job.customer.split(' ')[0]}</em>
                  ))}
                  {jobs.length > 3 && <em>+{jobs.length - 3}</em>}
                </span>
                {off && <span className="cal-off-tag">Off</span>}
              </button>
            );
          })}
        </div>

        <aside className="cal-detail">
          <p className="eyebrow">{formatDate(selected)}</p>
          <h3>{selectedOff ? 'Night off' : selectedIsWork ? 'Stitching night' : 'Not a work night'}</h3>
          {selectedIsWork && (
            <p className="helper">{booked} of {minutesPerSession} minutes reserved{selectedSession ? ` · ${selectedSession.minutesRemaining} open` : ''}.</p>
          )}
          {selectedSession?.jobs?.length ? (
            <ul>
              {selectedSession.jobs.map((job, index) => (
                <li key={`${job.orderId}-${index}`}>
                  <b>{job.minutes}m</b>
                  <button type="button" className="cal-job-link" onClick={() => onOpenOrder?.(job.orderId)}>{job.customer}</button>
                  <em>{job.phase}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">{selectedIsWork ? 'This night is still open.' : selectedOff ? 'You took this date off.' : 'Nothing is scheduled.'}</p>
          )}
          <div className="cal-quick">
            <button type="button" className="soft-button" onClick={() => onToggleDayOff(selected)}>
              {selectedOff ? 'Restore this night' : 'Take off'}
            </button>
            <button type="button" onClick={offThisWeek}>Off this week</button>
            <button type="button" onClick={clearFutureOff}>Clear future offs</button>
          </div>
        </aside>
      </section>
    </div>
  );
}
