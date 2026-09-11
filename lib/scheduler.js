export const defaultSettings = {
  workDays: [1, 3, 5],
  minutesPerSession: 180,
  daysOff: [],
};

export function normalizeSettings(settings = {}) {
  const workDays = [...new Set((settings.workDays || defaultSettings.workDays).map(Number))]
    .filter((day) => day >= 0 && day <= 6);
  return {
    workDays: workDays.length ? workDays : [...defaultSettings.workDays],
    minutesPerSession: Number(settings.minutesPerSession) || defaultSettings.minutesPerSession,
    daysOff: [...new Set((settings.daysOff || []).map((day) => String(day).slice(0, 10)))].sort(),
  };
}

export function weekDateKeys(from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() - from.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
}

export const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateKey = (date) => localDateKey(date);

const localDate = (key) => new Date(`${key}T12:00:00`);

export const formatDate = (key) => localDate(key).toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric',
});

const isWorkSession = (date, settings) => {
  const { workDays, daysOff } = normalizeSettings(settings);
  return workDays.includes(date.getDay()) && !daysOff.includes(dateKey(date));
};

const nextSession = (date, settings) => {
  const candidate = new Date(date);
  while (!isWorkSession(candidate, settings)) candidate.setDate(candidate.getDate() + 1);
  return candidate;
};

const buildSessions = (settings, count = 180) => {
  const sessions = [];
  let cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    cursor = nextSession(cursor, settings);
    sessions.push({ date: dateKey(cursor), minutesRemaining: Number(settings.minutesPerSession) || 0, jobs: [] });
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
};

const assignPhase = (sessions, order, phase, minutes, startAt) => {
  let remaining = Math.max(0, Number(minutes) || 0);
  let sessionIndex = startAt;
  let lastDate = null;
  const allocations = [];
  while (remaining > 0 && sessionIndex < sessions.length) {
    const session = sessions[sessionIndex];
    if (session.minutesRemaining === 0) {
      sessionIndex += 1;
      continue;
    }
    const booked = Math.min(remaining, session.minutesRemaining);
    session.minutesRemaining -= booked;
    remaining -= booked;
    lastDate = session.date;
    const allocation = { orderId: order.id, customer: order.customer, phase, minutes: booked, priority: order.priority };
    session.jobs.push(allocation);
    allocations.push({ date: session.date, ...allocation });
    if (remaining > 0) sessionIndex += 1;
  }
  return { allocations, lastDate, nextIndex: sessionIndex, unassigned: remaining };
};

export const createSchedule = (orders, settings) => {
  const sessions = buildSessions(settings);
  const activeOrders = orders
    .filter((order) => order.status !== 'complete' && order.status !== 'cancelled')
    .sort((a, b) => (a.priority === 'rush' ? -1 : 0) - (b.priority === 'rush' ? -1 : 0) || new Date(a.createdAt) - new Date(b.createdAt));

  const results = {};
  let sessionIndex = 0;
  activeOrders.forEach((order) => {
    const design = assignPhase(sessions, order, 'Design', order.designMinutes, sessionIndex);
    const stitch = assignPhase(sessions, order, 'Stitch', order.stitchMinutes, design.nextIndex);
    sessionIndex = stitch.nextIndex;
    results[order.id] = {
      design: design.allocations,
      stitch: stitch.allocations,
      completionDate: stitch.lastDate || design.lastDate,
      totalMinutes: (Number(order.designMinutes) || 0) + (Number(order.stitchMinutes) || 0),
      unassigned: design.unassigned + stitch.unassigned,
    };
  });
  return { sessions, results, activeOrders };
};

export function addBusinessDays(start, count = 10) {
  const date = new Date(start);
  date.setHours(12, 0, 0, 0);
  let remaining = count;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return localDateKey(date);
}

export const turnaround = (schedule) => {
  const lastOrder = schedule.activeOrders.at(-1);
  if (!lastOrder) {
    const defaultDone = addBusinessDays(new Date(), 10);
    return {
      label: `Ready by ${formatDate(defaultDone)}`,
      detail: 'Does not include shipping time. Custom pieces can take longer.',
    };
  }
  const completion = schedule.results[lastOrder.id]?.completionDate;
  return completion
    ? { label: `Ready by ${formatDate(completion)}`, detail: 'Studio finish date — shipping is extra if your order ships. Custom pieces can take longer.' }
    : { label: 'New orders are being reviewed', detail: 'Please contact us for a completion estimate. Shipping time is extra if your order ships. Custom pieces can take longer.' };
};

export function toScheduleOrder(order) {
  const items = order.items || [];
  const designMinutes = items.reduce((sum, item) => sum + (Number(item.design_minutes) || 0) * (Number(item.quantity) || 1), 0);
  const stitchMinutes = items.reduce((sum, item) => sum + (Number(item.stitch_minutes) || 0) * (Number(item.quantity) || 1), 0);
  const complete = order.fulfillment_status === 'complete' || order.fulfillment_status === 'cancelled' || order.fulfillment_status === 'shipped';
  return {
    id: order.id,
    customer: order.name || order.customer || 'Customer',
    item: items.map((item) => item.name).join(', ') || order.item || 'Order',
    designMinutes,
    stitchMinutes,
    priority: order.priority || 'standard',
    createdAt: order.created_at || order.createdAt,
    status: complete ? 'complete' : 'queued',
    paid: order.payment_status === 'paid',
  };
}

export function schedulableOrders(orders) {
  return (orders || [])
    .filter((order) => order.payment_status === 'paid' && !['complete', 'cancelled'].includes(order.fulfillment_status))
    .map(toScheduleOrder);
}
