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

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const linkId = event.notification.data && event.notification.data.linkId;
	const targetUrl = linkId ? "/me/debt-note" : "/me/debt-note";
	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
			for (const client of list) {
				if ("focus" in client) {
					client.postMessage({
						type: "debt-push-click",
						data: event.notification.data || {},
					});
					return client.focus();
				}
			}
			if (clients.openWindow) return clients.openWindow(targetUrl);
		}),
	);
});
