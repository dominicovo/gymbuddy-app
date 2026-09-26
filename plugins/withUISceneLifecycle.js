// Adopts the UIScene lifecycle so the app launches when built with the iOS 27 SDK.
//
// UIKit traps at launch (`_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`)
// for apps linked against the iOS 27 SDK that still start from AppDelegate alone.
// Expo SDK 57's template does exactly that; SDK 58 fixes it natively. Until we
// upgrade, this plugin moves window creation into a SceneDelegate and registers
// it in Info.plist. Remove once on SDK 58+.
// Ref: https://github.com/expo/expo/issues/50179
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

const SCENE_DELEGATE = `
// Added by plugins/withUISceneLifecycle.js — required on the iOS 27 SDK.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    // A window built with UIWindow(frame:) never attaches to the scene — it must come from here.
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)

    // application(_:open:options:) is never called under the scene lifecycle, so cold-launch
    // URLs (gymbuddy://, Google sign-in callback, Metro) have to be forwarded by hand.
    for context in connectionOptions.urlContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      _ = RCTLinkingManager.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes('class SceneDelegate')) return contents;

  const windowBlock = /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\([\s\S]*?\)\s*\n#endif/;
  if (!windowBlock.test(contents) || !contents.includes('var window: UIWindow?')) {
    throw new Error('withUISceneLifecycle: AppDelegate.swift does not match the Expo SDK 57 template; update the plugin.');
  }

  return (
    contents
      .replace('var window: UIWindow?', 'var window: UIWindow?\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?')
      .replace(windowBlock, '    // Window creation and React startup happen in SceneDelegate.\n    self.launchOptions = launchOptions') +
    SCENE_DELEGATE
  );
}

module.exports = function withUISceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return c;
  });
  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('withUISceneLifecycle only supports the Swift AppDelegate.');
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });
  return config;
};
