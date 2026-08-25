import { DEMO } from '../api';
import { resetDemo } from '../demo/backend';

/** Only ever rendered in the static demo build. People are looking at what
 *  appears to be a ticket shop — they should know no money moves and no
 *  booking leaves their phone. */
export function DemoBanner() {
  if (!DEMO) return null;
  return (
    <div className="demo">
      <p>
        <strong>DEMO</strong> — the front end running on its own. Bookings are stored in this
        browser only, nothing is charged, and the party details are placeholder.
        {' '}
        <button
          type="button"
          onClick={() => {
            resetDemo();
            window.location.reload();
          }}
        >
          reset
        </button>
      </p>
    </div>
  );
}
