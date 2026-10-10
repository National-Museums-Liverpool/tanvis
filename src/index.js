import { init } from './init.js';
import { version } from './version.js';

export { init, version };

if (typeof window !== 'undefined') {
  window.Tanvis = window.Tanvis || {};
  window.Tanvis.config = window.Tanvis.config || {};
  window.Tanvis.init = init;
  window.Tanvis.version = version;
}
