importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Must match the config in src/services/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBI8nMgHtPuUpaXxlShk43V94uHBQNca94",
  authDomain: "ecstatic-maxim-477619-k6.firebaseapp.com",
  projectId: "ecstatic-maxim-477619-k6",
  storageBucket: "ecstatic-maxim-477619-k6.firebasestorage.app",
  messagingSenderId: "20156525147",
  appId: "1:20156525147:web:ac3430ad0f268ce9612d7e",
  measurementId: "G-Y3LF2SZ451"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title || 'SmartCity Alert';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
