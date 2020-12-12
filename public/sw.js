//self = this

// const { response } = require("express");

//install cycle method
const fileCacheName = 'file-v1';
const dataCacheName = 'data-v1';

const filesToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/index.js',
    '/db.js',
    '/models/transaction.js',
    '/manifest.webmanifest',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/assets/images/icon/mainIcon.png',
    '/assets/images/icon/calculator.png',
    '/assets/images/icon/secondaryIcon.png'
];

self.addEventListener('install', (event) => {
    console.log('hit install');

    event.waitUntil(
        caches
            .open(fileCacheName)
            .then(cache => {
                return cache.addAll(filesToCache);
            })
            .catch(err => console.log('Error caching files on install', err))

    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('hit activation')
    event.waitUntil(
        caches
            .keys()
            .then(keyList => {
                return Promise.all(
                    keyList.map(key => {
                        //if current key does not equal current cache name, delete it DONT FORGET THE DATACACHE
                        if (key !== fileCacheName && key !== dataCacheName) {
                            console.log('deleting Cache');
                            return caches.delete(key)
                        }
                    })
                );
            })
    );
    //if any open clients, update to active service worker
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    //handle api caching 
    if (event.request.url.includes('/api')) {
        return event.respondWith(
            caches
                .open(dataCacheName)
                .then(cache => {
                    return fetch(event.request)
                        .then(response => {
                            if (response.status === 200) {
                                cache.put(event.request.url, response.clone());
                            }
                            return response
                        })
                        .catch(err => {
                            //network failed, use cached
                            return cache.match(event.request);
                        })
                })
                .catch(err => console.log('error fetching api: ', err))
        );
    };

    // event.respondWith(
    //     caches
    //         .match(event.request)
    //         .then(response => {
    //             return response || fetch(event.request);
    //         })
    //         .catch(err => console.log(err))
    // );

    // another way of doing it 
    event.respondWith(
        caches
            .match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then((response) => {
                        if (!response || !response.basic || !response.status !== 200) {
                            console.log('fetch response: ', response);
                            return response;
                        }

                        //response is a stream, reading will consume the response
                        const responseToCache = response.clone();

                        caches
                            .open(cacheName)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(err => console.log(err));

                        return response;
                    });
            })
            .catch(err => console.log('error'))
    )
});