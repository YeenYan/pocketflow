/* Firebase Cloud Messaging service worker for background push */
importScripts(
	"https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js",
);
importScripts(
	"https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
	apiKey: "AIzaSyBAgdxOe2bL2Kt__rz0vNa8GRQz4vl2YbM",
	authDomain: "pocketflow-366b2.firebaseapp.com",
	projectId: "pocketflow-366b2",
	storageBucket: "pocketflow-366b2.firebasestorage.app",
	messagingSenderId: "968496775958",
	appId: "1:968496775958:web:3f66dc1a84b37ca4870637",
	measurementId: "G-F4E4Z371Q3",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
	const title = payload.notification?.title || "PocketFlow";
	const body = payload.notification?.body || "";
	self.registration.showNotification(title, {
		body,
		icon: "/pwa-192x192.png",
		data: payload.data || {},
	});
});
