import { useCountdown } from '../hooks/useCountdown';

const pad = (value: number) => String(value).padStart(2, '0');

export function Countdown({
  target,
  caption,
  live = false
}: {
  target: string;
  caption: string;
  live?: boolean;
}) {
  const { days, hours, minutes, seconds } = useCountdown(target);

  return (
    <>
      <p className={`countdown__cap${live ? ' is-live' : ''}`}>{caption}</p>
      <div className={`countdown${live ? ' is-live' : ''}`} role="timer" aria-hidden="true">
        {[
          [pad(days), 'days'],
          [pad(hours), 'hrs'],
          [pad(minutes), 'min'],
          [pad(seconds), 'sec']
        ].map(([value, label]) => (
          <div className="countdown__unit" key={label}>
            <span className="countdown__num">{value}</span>
            <span className="countdown__lab">{label}</span>
          </div>
        ))}
      </div>
      {/* One sentence a minute for screen readers, not sixty. */}
      <p className="sr-only" aria-live="polite">
        {`${caption.toLowerCase()} ${days} days, ${hours} hours, ${minutes} minutes.`}
      </p>
    </>
  );
}
