import { assertProductionConfig, config } from './config.js';
import { createApp } from './app.js';
import { getDb } from './db.js';
import { livePartyRow } from './parties.js';

assertProductionConfig();

const db = getDb();
const live = livePartyRow(db);

createApp().listen(config.port, () => {
  console.log(`GUMMYBEARS api  → http://localhost:${config.port}`);
  console.log(`payments        → ${config.payments.provider}`);
  console.log(
    live ? `live party      → ${live.name} (vol. ${live.volume})` : 'live party      → none'
  );
  if (config.dev && config.admin.password === 'letmein') {
    console.log('admin password  → letmein (development default — set ADMIN_PASSWORD)');
  }
});
