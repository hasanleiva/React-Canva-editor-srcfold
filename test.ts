import { pathToRegexp } from 'path-to-regexp';

try {
  console.log(pathToRegexp('/api/templates/(.*)'));
} catch (e) {
  console.error(e);
}
