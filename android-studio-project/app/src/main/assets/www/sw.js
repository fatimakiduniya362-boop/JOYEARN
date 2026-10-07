/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "043e49ff7fe06062546f2cfea69cf888"
  }, {
    "url": "assets/vendor-ui-DJxqPFih.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-Ct0ktq7j.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-CXHxssQy.js",
    "revision": null
  }, {
    "url": "assets/index-BRrrJOyZ.js",
    "revision": null
  }, {
    "url": "assets/index-BLA4mLv_.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1fb41634cae501500add4b1118fd2036"
  }, {
    "url": "icon.svg",
    "revision": "2fabfd383853b84e66390975af0374bb"
  }, {
    "url": "pwa-192x192.png",
    "revision": "dd971702511532962c48d2a897284537"
  }, {
    "url": "pwa-512x512.png",
    "revision": "91e3dc9b12ac7a908a5b20442d33107a"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "21bef87ca5ebec653eb2e517e69df264"
  }, {
    "url": ".well-known/assetlinks.json",
    "revision": "98aa9b43ebe4fa5954c33d7583459cca"
  }, {
    "url": "manifest.webmanifest",
    "revision": "7a4361502431410db7825d4e63ca059a"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
