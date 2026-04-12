import fs from 'fs';
import path from 'path';

describe('Android Release Build Config Regression', () => {
  const mobileAppRoot = path.resolve(__dirname, '..', '..');
  const appJsonPath = path.join(mobileAppRoot, 'app.json');
  const gradlePropertiesPath = path.join(mobileAppRoot, 'android', 'gradle.properties');

  it('BUG-REGRESSION: Expo app config must keep New Architecture disabled', () => {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    expect(appConfig?.expo?.newArchEnabled).toBe(false);
  });

  it('BUG-REGRESSION: Android gradle config must keep New Architecture disabled', () => {
    const gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');

    expect(gradleProperties).toMatch(/^\s*newArchEnabled=false\s*$/m);
  });

  it('BUG-REGRESSION: Expo app config and Android gradle config must stay aligned', () => {
    const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const gradleProperties = fs.readFileSync(gradlePropertiesPath, 'utf8');
    const gradleNewArchValue = gradleProperties.match(/^\s*newArchEnabled=(true|false)\s*$/m)?.[1];

    expect(gradleNewArchValue).toBeDefined();
    expect(String(appConfig?.expo?.newArchEnabled)).toBe(gradleNewArchValue);
  });
});
