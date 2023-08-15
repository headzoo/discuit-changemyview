import './config';
import { createDatabase } from './database';
import { runDiscuitWatch } from './discuit';

(async () => {
  await createDatabase();
  await runDiscuitWatch();
})();
