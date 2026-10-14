// Shared in-flight promise so Header and TurnaroundNote make one request per page.
let pending;
export function fetchTurnaround() {
  pending ??= fetch('/api/turnaround', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)
    .finally(() => { pending = undefined; });
  return pending;
}
