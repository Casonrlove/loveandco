export default function TurnaroundNote({ turnaround, compact = false }) {
  if (!turnaround?.label) return null;
  return (
    <p className={`timing-note${compact ? ' is-compact' : ''}`}>
      <strong>{turnaround.label}</strong>
      {!compact && turnaround.detail ? <span>{turnaround.detail}</span> : null}
    </p>
  );
}
