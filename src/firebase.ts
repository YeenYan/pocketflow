import { initializeApp } from "firebase/app";
import {
	getAuth,
	onAuthStateChanged,
	signInAnonymously,
	type User,
} from "firebase/auth";
import {
	doc,
	getDoc,
	getFirestore,
	onSnapshot,
	setDoc,
	updateDoc,
	collection,
	getDocs,
	deleteDoc,
} from "firebase/firestore";
import {
	getMessaging,
	getToken,
	isSupported,
	onMessage,
	type Messaging,
} from "firebase/messaging";
import { createId, db, type DebtNote, type DebtPayment } from "./db/budgetDb";

const firebaseConfig = {
	apiKey: "AIzaSyBAgdxOe2bL2Kt__rz0vNa8GRQz4vl2YbM",
	authDomain: "pocketflow-366b2.firebaseapp.com",
	projectId: "pocketflow-366b2",
	storageBucket: "pocketflow-366b2.firebasestorage.app",
	messagingSenderId: "968496775958",
	appId: "1:968496775958:web:3f66dc1a84b37ca4870637",
	measurementId: "G-F4E4Z371Q3",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

let messaging: Messaging | null = null;
let authReady: Promise<User> | null = null;

function makeInviteCode() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

export function ensureFirebaseAuth(): Promise<User> {
	if (authReady) return authReady;
	authReady = new Promise((resolve, reject) => {
		const unsub = onAuthStateChanged(
			firebaseAuth,
			async (user) => {
				unsub();
				try {
					if (user) {
						resolve(user);
						return;
					}
					const cred = await signInAnonymously(firebaseAuth);
					resolve(cred.user);
				} catch (err) {
					reject(err);
				}
			},
			reject,
		);
	});
	return authReady;
}

export async function syncFirebaseUserProfile() {
	const user = await ensureFirebaseAuth();
	const profile = await db.userProfiles.get(1);
	const displayName = profile?.displayName?.trim() || "User";
	if (profile && profile.firebaseUid !== user.uid) {
		await db.userProfiles.update(1, {
			firebaseUid: user.uid,
			updatedAt: new Date().toISOString(),
		});
	}
	await setDoc(
		doc(firestore, "users", user.uid),
		{
			uid: user.uid,
			displayName,
			updatedAt: new Date().toISOString(),
		},
		{ merge: true },
	);
	return user;
}

export async function registerFcmToken() {
	const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
	if (!vapidKey) {
		console.warn(
			"VITE_FIREBASE_VAPID_KEY is missing. FCM token registration skipped.",
		);
		return null;
	}
	const supported = await isSupported();
	if (!supported) return null;

	if (!("Notification" in window)) return null;
	const permission = await Notification.requestPermission();
	if (permission !== "granted") return null;

	messaging = getMessaging(firebaseApp);
	const swRegistration = await navigator.serviceWorker.register(
		"/firebase-messaging-sw.js",
	);
	const token = await getToken(messaging, {
		vapidKey,
		serviceWorkerRegistration: swRegistration,
	});
	if (!token) return null;

	const user = await ensureFirebaseAuth();
	const profile = await db.userProfiles.get(1);
	if (profile) {
		await db.userProfiles.update(1, {
			fcmToken: token,
			firebaseUid: user.uid,
			updatedAt: new Date().toISOString(),
		});
	}

	const userRef = doc(firestore, "users", user.uid);
	const snap = await getDoc(userRef);
	const existing = (snap.data()?.fcmTokens as string[] | undefined) ?? [];
	const next = existing.includes(token) ? existing : [...existing, token];
	await setDoc(
		userRef,
		{
			uid: user.uid,
			fcmTokens: next,
			updatedAt: new Date().toISOString(),
		},
		{ merge: true },
	);
	return token;
}

export function listenForegroundMessages(
	handler: (title: string, body: string, data: Record<string, string>) => void,
) {
	if (!messaging) return () => {};
	return onMessage(messaging, (payload) => {
		const title = payload.notification?.title ?? "PocketFlow";
		const body = payload.notification?.body ?? "";
		const data = (payload.data ?? {}) as Record<string, string>;
		handler(title, body, data);
	});
}

export async function createDebtInvite(note: DebtNote) {
	const user = await syncFirebaseUserProfile();
	const profile = await db.userProfiles.get(1);
	const lenderName = profile?.displayName?.trim() || "User";

	if (note.linkId && note.inviteCode) {
		return {
			linkId: note.linkId,
			inviteCode: note.inviteCode,
		};
	}

	const linkId = createId();
	const inviteCode = makeInviteCode();
	const now = new Date().toISOString();

	await setDoc(doc(firestore, "debtLinks", linkId), {
		linkId,
		amount: note.amount,
		title: note.title,
		date: note.date,
		lenderUid: user.uid,
		borrowerUid: null,
		lenderName,
		borrowerName: null,
		inviteCode,
		status: "pending",
		createdAt: now,
		updatedAt: now,
	});

	await setDoc(doc(firestore, "invites", inviteCode), {
		inviteCode,
		linkId,
		lenderUid: user.uid,
		expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		usedByUid: null,
	});

	await db.debtNotes.update(note.id, {
		linkId,
		inviteCode,
		role: "lender",
		counterpartyName: note.title,
		syncStatus: "pending",
	});

	return { linkId, inviteCode };
}

export async function claimDebtInvite(code: string) {
	const inviteCode = code.trim().toUpperCase();
	if (!inviteCode) throw new Error("Enter an invite code.");

	const user = await syncFirebaseUserProfile();
	const profile = await db.userProfiles.get(1);
	const borrowerName = profile?.displayName?.trim() || "User";

	const inviteRef = doc(firestore, "invites", inviteCode);
	const inviteSnap = await getDoc(inviteRef);
	if (!inviteSnap.exists()) throw new Error("Invite code not found.");

	const invite = inviteSnap.data();
	if (invite.usedByUid) throw new Error("This invite was already used.");
	if (invite.expiresAt && invite.expiresAt < new Date().toISOString()) {
		throw new Error("This invite has expired.");
	}
	if (invite.lenderUid === user.uid) {
		throw new Error("You cannot claim your own invite.");
	}

	const existing = await db.debtNotes
		.where("linkId")
		.equals(invite.linkId)
		.first();
	if (existing) return existing;

	const linkRef = doc(firestore, "debtLinks", invite.linkId);
	const linkSnap = await getDoc(linkRef);
	if (!linkSnap.exists()) throw new Error("Debt link not found.");
	const link = linkSnap.data();
	if (link.status === "linked" && link.borrowerUid) {
		throw new Error("This debt is already linked.");
	}

	const now = new Date().toISOString();
	await updateDoc(linkRef, {
		borrowerUid: user.uid,
		borrowerName,
		status: "linked",
		updatedAt: now,
	});
	await updateDoc(inviteRef, { usedByUid: user.uid });

	const localNote: DebtNote = {
		id: createId(),
		type: "borrowed",
		title: link.lenderName || "Lender",
		amount: Number(link.amount) || 0,
		date: String(link.date || now.slice(0, 10)),
		createdAt: now,
		linkId: invite.linkId,
		inviteCode,
		role: "borrower",
		counterpartyUid: link.lenderUid,
		counterpartyName: link.lenderName || "Lender",
		syncStatus: "linked",
	};
	await db.debtNotes.add(localNote);

	await pullDebtPayments(invite.linkId, localNote.id);
	return localNote;
}

export async function pushDebtPayment(
	linkId: string,
	payment: DebtPayment,
	uid: string,
) {
	const paymentId = payment.cloudPaymentId || payment.id;
	await setDoc(doc(firestore, "debtLinks", linkId, "payments", paymentId), {
		paymentId,
		amount: payment.amount,
		date: payment.date,
		description: payment.description,
		createdByUid: uid,
		createdAt: payment.createdAt,
		updatedAt: new Date().toISOString(),
	});
	return paymentId;
}

export async function updateDebtPaymentCloud(
	linkId: string,
	cloudPaymentId: string,
	data: { amount: number; date: string; description: string },
) {
	await updateDoc(doc(firestore, "debtLinks", linkId, "payments", cloudPaymentId), {
		...data,
		updatedAt: new Date().toISOString(),
	});
}

export async function deleteDebtPaymentCloud(
	linkId: string,
	cloudPaymentId: string,
) {
	await deleteDoc(doc(firestore, "debtLinks", linkId, "payments", cloudPaymentId));
}

export async function pullDebtPayments(linkId: string, localNoteId: string) {
	const snap = await getDocs(collection(firestore, "debtLinks", linkId, "payments"));
	const existing = await db.debtPayments
		.where("debtNoteId")
		.equals(localNoteId)
		.toArray();

	for (const docSnap of snap.docs) {
		const data = docSnap.data();
		const cloudPaymentId = String(data.paymentId || docSnap.id);
		const found = existing.find((p) => p.cloudPaymentId === cloudPaymentId);
		if (found) {
			await db.debtPayments.update(found.id, {
				amount: Number(data.amount) || 0,
				date: String(data.date || ""),
				description: String(data.description || ""),
				syncedAt: new Date().toISOString(),
			});
		} else {
			await db.debtPayments.add({
				id: createId(),
				debtNoteId: localNoteId,
				amount: Number(data.amount) || 0,
				date: String(data.date || ""),
				description: String(data.description || ""),
				createdAt: String(data.createdAt || new Date().toISOString()),
				cloudPaymentId,
				createdByUid: String(data.createdByUid || ""),
				syncedAt: new Date().toISOString(),
			});
		}
	}

	await db.debtNotes.update(localNoteId, { syncStatus: "linked" });
}

export function listenDebtPayments(
	linkId: string,
	localNoteId: string,
	onRemotePayment?: (amount: number, fromOther: boolean) => void,
) {
	const known = new Set<string>();
	let ready = false;

	return onSnapshot(
		collection(firestore, "debtLinks", linkId, "payments"),
		async (snap) => {
			const user = firebaseAuth.currentUser;

			for (const change of snap.docChanges()) {
				const data = change.doc.data();
				const cloudPaymentId = String(data.paymentId || change.doc.id);
				const amount = Number(data.amount) || 0;
				const createdByUid = String(data.createdByUid || "");
				const fromOther = !!user && createdByUid !== user.uid;

				const existing = await db.debtPayments
					.where("debtNoteId")
					.equals(localNoteId)
					.toArray();

				if (change.type === "removed") {
					const found = existing.find((p) => p.cloudPaymentId === cloudPaymentId);
					if (found) await db.debtPayments.delete(found.id);
					known.delete(cloudPaymentId);
					continue;
				}

				const found = existing.find((p) => p.cloudPaymentId === cloudPaymentId);
				if (found) {
					await db.debtPayments.update(found.id, {
						amount,
						date: String(data.date || ""),
						description: String(data.description || ""),
						syncedAt: new Date().toISOString(),
					});
				} else {
					await db.debtPayments.add({
						id: createId(),
						debtNoteId: localNoteId,
						amount,
						date: String(data.date || ""),
						description: String(data.description || ""),
						createdAt: String(data.createdAt || new Date().toISOString()),
						cloudPaymentId,
						createdByUid,
						syncedAt: new Date().toISOString(),
					});
				}

				if (ready && change.type === "added" && !known.has(cloudPaymentId)) {
					onRemotePayment?.(amount, fromOther);
				}
				known.add(cloudPaymentId);
			}

			if (!ready) {
				for (const d of snap.docs) {
					known.add(String(d.data().paymentId || d.id));
				}
				ready = true;
			}
		},
	);
}

export async function markLocalNoteLinked(linkId: string) {
	const linkSnap = await getDoc(doc(firestore, "debtLinks", linkId));
	const note = await db.debtNotes.where("linkId").equals(linkId).first();
	if (!note) return;

	if (!linkSnap.exists() || linkSnap.data()?.status === "removed") {
		const pays = await db.debtPayments
			.where("debtNoteId")
			.equals(note.id)
			.toArray();
		for (const p of pays) await db.debtPayments.delete(p.id);
		await db.debtNotes.delete(note.id);
		return;
	}

	const link = linkSnap.data();
	if (link.status === "linked") {
		await db.debtNotes.update(note.id, {
			syncStatus: "linked",
			counterpartyUid:
				note.role === "lender" ? link.borrowerUid : link.lenderUid,
			counterpartyName:
				note.role === "lender" ? link.borrowerName : link.lenderName,
		});
	}
}

export async function removeDebtLinkCloud(linkId: string, inviteCode?: string) {
	const user = await ensureFirebaseAuth();
	const paySnap = await getDocs(
		collection(firestore, "debtLinks", linkId, "payments"),
	);
	for (const row of paySnap.docs) {
		await deleteDoc(row.ref);
	}
	await updateDoc(doc(firestore, "debtLinks", linkId), {
		status: "removed",
		removedByUid: user.uid,
		updatedAt: new Date().toISOString(),
	});
	if (inviteCode) {
		try {
			await deleteDoc(doc(firestore, "invites", inviteCode));
		} catch {
			/* invite may already be gone */
		}
	}
}

export function listenDebtLinkRemoval(linkId: string, onRemoved: () => void) {
	return onSnapshot(doc(firestore, "debtLinks", linkId), (snap) => {
		if (!snap.exists() || snap.data()?.status === "removed") {
			onRemoved();
		}
	});
}
