const {
  createConfig,
} = require("react-native-device-activity/config-plugin/createExpoTargetConfig");

const baseConfig = createConfig("device-activity-monitor");

// Matches the bundle identifier already approved by Apple for the
// Family Controls entitlement on this extension.
module.exports = (config) => ({
  ...baseConfig(config),
  bundleIdentifier: ".DeviceActivityMonitor",
});
