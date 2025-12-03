#!/usr/bin/env node

/**
 * Post-build script for PWA configuration
 * Runs after `expo export -p web` to restore PWA-specific files
 * This ensures manifest.json and service-worker.js aren't overwritten by the build
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

console.log('🔧 Running PWA post-build configuration...');

// 1. Copy manifest.json with proper PWA configuration
const manifestContent = {
  "short_name": "Notetedd",
  "name": "Notetedd",
  "description": "Your smart learning tool",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    },
    {
      "src": "/adaptive-icon.png",
      "type": "image/png",
      "sizes": "144x144",
      "purpose": "any"
    }
  ],
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "screenshots": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "form_factor": "narrow"
    },
    {
      "src": "/adaptive-icon.png",
      "type": "image/png    ",
      "sizes": "144x144",
      "form_factor": "wide"
    }
  ]
};

const manifestPath = path.join(distDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2));
console.log('✅ Updated dist/manifest.json with PWA configuration');

// 2. Copy service-worker.js with enhanced caching
const swContent = `const CACHE_NAME = 'notetedd-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png',
  '/adaptive-icon.png',
  '/splash-bg.png',
  '/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache addAll error:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API calls, try network first, then cache
  if (url.pathname.includes('/api')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For everything else, try cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request).then(res => {
          if (!res || res.status !== 200 || res.type !== 'basic') {
            return res;
          }
          const responseToCache = res.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseToCache));
          return res;
        });
      })
      .catch(() => {
        // Return a fallback response if both cache and network fail
        if (request.destination === 'image') {
          return caches.match('/icon-192.png');
        }
        return new Response('Offline - resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});
`;

const swPath = path.join(distDir, 'service-worker.js');
fs.writeFileSync(swPath, swContent);
console.log('✅ Updated dist/service-worker.js with enhanced caching');

// 3. Update dist/index.html to include manifest and service worker registration
const indexHtmlPath = path.join(distDir, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

// Check if manifest link already exists
if (!indexHtml.includes('rel="manifest"')) {
  // Find the closing </head> tag and add PWA links before it
  indexHtml = indexHtml.replace(
    '</head>',
    `<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="description" content="Your smart learning tool" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.jpg" /></head>
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('Service Worker registered:', reg);
    }).catch(err => {
      console.log('Service Worker registration failed:', err);
    });
  });
}
</script>`
  );
  
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('✅ Updated dist/index.html with PWA configuration');
} else {
  console.log('✓ dist/index.html already has PWA configuration');
}

console.log('🎉 PWA post-build configuration complete!');
