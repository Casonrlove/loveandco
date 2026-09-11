'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'react-bootstrap-icons';
import { formatDate, localDateKey, weekDateKeys } from '@/lib/scheduler';
import { useScrollLock } from '@/lib/scroll-lock';

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
  const daysOff = settings.daysOff || [];
  const selectedOff = daysOff.includes(selected);
  const selectedDate = new Date(`${selected}T12:00:00`);
  const selectedIsWork = (settings.workDays || []).map(Number).includes(selectedDate.getDay()) && !selectedOff;
  const booked = selectedSession ? Number(minutesPerSession) - selectedSession.minutesRemaining : 0;

  useScrollLock(open);

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

  const weekKeys = weekDateKeys(selectedDate);
  const weekIsOff = weekKeys.every((key) => daysOff.includes(key));

  const offThisWeek = () => {
    onSetDaysOff((current) => [...new Set([...(current.daysOff || []), ...weekKeys])]);
  };

  const restoreThisWeek = () => {
    const week = new Set(weekKeys);
    onSetDaysOff((current) => (current.daysOff || []).filter((date) => !week.has(date)));
  };

  const clearFutureOff = () => {
    onSetDaysOff((current) => (current.daysOff || []).filter((date) => date < today));
  };

  return (
    <>
      <button className="scrim" type="button" aria-label="Close calendar" onClick={onClose} />
      <section className="cal-sheet" role="dialog" aria-modal="true" aria-labelledby="cal-title">
        <header className="cal-head">
          <div>
            <p className="eyebrow">Studio calendar</p>
            <h2 id="cal-title">{title}</h2>
          </div>
          <div className="cal-nav">
            <button className="icon-btn" type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft aria-hidden="true" /></button>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setCursor(startOfMonth(new Date()))}>Today</button>
            <button className="icon-btn" type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight aria-hidden="true" /></button>
            <button
              className={`btn btn--sm ${offMode ? 'btn--primary' : 'btn--secondary'}`}
              type="button"
              aria-pressed={offMode}
              onClick={() => setOffMode((value) => !value)}
            >
              {offMode ? 'Click days to take off' : 'Mark days off'}
            </button>
          </div>
          <button className="icon-btn cal-close" type="button" onClick={onClose} aria-label="Close calendar"><X aria-hidden="true" /></button>
        </header>

        <div className="cal-legend">
          <span><i className="swatch work" /> Work night</span>
          <span><i className="swatch booked" /> On the machine</span>
          <span><i className="swatch off" /> Day off</span>
          <span className="cal-hint">Shift-click a day to flip off · O toggles selected · M mark-off mode</span>
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
            const work = (settings.workDays || []).map(Number).includes(date.getDay()) && !off;
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
          <div className="cal-detail-status">
            <p className="eyebrow">{formatDate(selected)}</p>
            <h3>{selectedOff ? 'Day off' : selectedIsWork ? 'Stitching night' : 'Not a stitch night'}</h3>
            <p className="helper">
              {selectedOff
                ? 'This date is blocked. New work will skip it.'
                : selectedIsWork
                  ? `${booked} of ${minutesPerSession} minutes reserved${selectedSession ? ` · ${selectedSession.minutesRemaining} open` : ''}.`
                  : 'Not a regular work night. You can still block it.'}
            </p>
          </div>
          <div className="cal-detail-jobs">
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
            ) : null}
          </div>
          <div className="cal-quick">
            <button type="button" className="btn btn--primary btn--sm" onClick={weekIsOff ? restoreThisWeek : offThisWeek}>
              {weekIsOff ? 'Restore this week' : 'Take this week off'}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onToggleDayOff(selected)}>
              {selectedOff ? 'Put this date back on' : 'Block only this date'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFutureOff}>Clear upcoming days off</button>
          </div>
        </aside>
      </section>
    </>
  );
}
