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
	try {
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
		const existing = await navigator.serviceWorker.getRegistration(
			"/firebase-messaging-sw.js",
		);
		const swRegistration =
			existing ??
			(await navigator.serviceWorker.register("/firebase-messaging-sw.js"));
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
		const existingTokens = (snap.data()?.fcmTokens as string[] | undefined) ?? [];
		const next = existingTokens.includes(token)
			? existingTokens
			: [...existingTokens, token];
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
	} catch {
		// Push often unavailable on HTTP / some browsers — don't block debt sync.
		return null;
	}
}

export function listenForegroundMessages(
	handler: (title: string, body: string, data: Record<string, string>) => void,
) {
	if (!messaging) {
		try {
			messaging = getMessaging(firebaseApp);
		} catch {
			return () => {};
		}
	}
	return onMessage(messaging, (payload) => {
		const title = payload.notification?.title ?? "PocketFlow";
		const body = payload.notification?.body ?? "";
		const data = (payload.data ?? {}) as Record<string, string>;
		handler(title, body, data);
	});
}

export async function applyDebtPushData(data: Record<string, string>) {
	const linkId = data.linkId;
	if (!linkId) return;
	const note = await db.debtNotes.where("linkId").equals(linkId).first();
	if (!note) return;

	if (data.type === "debt_removed") {
		const pays = await db.debtPayments
			.where("debtNoteId")
			.equals(note.id)
			.toArray();
		for (const p of pays) await db.debtPayments.delete(p.id);
		await db.debtNotes.delete(note.id);
		return;
	}

	if (
		data.type === "debt_payment" ||
		data.type === "debt_payment_pending" ||
		data.type === "debt_payment_approved" ||
		data.type === "debt_payment_rejected"
	) {
		await pullDebtPayments(linkId, note.id);
	}
}

type DebtSyncEvent = {
	kind:
		| "payment"
		| "payment_pending"
		| "payment_approved"
		| "payment_rejected"
		| "removed";
	amount?: number;
	who?: string;
	when?: string;
	noteTitle?: string;
};

let debtSyncNotifier: ((event: DebtSyncEvent) => void) | null = null;
let stopGlobalDebtSync: (() => void) | null = null;
let refreshInFlight: Promise<void> | null = null;

export function setDebtSyncNotifier(
	notifier: ((event: DebtSyncEvent) => void) | null,
) {
	debtSyncNotifier = notifier;
}

export async function refreshGlobalDebtSync() {
	if (refreshInFlight) return refreshInFlight;

	refreshInFlight = (async () => {
		stopGlobalDebtSync?.();
		stopGlobalDebtSync = null;

		const notes = await db.debtNotes.toArray();
		const stops: Array<() => void> = [];

		for (const note of notes) {
			if (!note.linkId) continue;
			const linkId = note.linkId;
			const noteId = note.id;

			try {
				await markLocalNoteLinked(linkId);
				const still = await db.debtNotes.get(noteId);
				if (!still?.linkId) continue;
				await pullDebtPayments(still.linkId, still.id);
			} catch {
				/* offline / rules */
			}

			const still = await db.debtNotes.get(noteId);
			if (!still?.linkId) continue;

			stops.push(
				listenDebtPayments(
					still.linkId,
					still.id,
					(amount, fromOther, date, status, eventKind) => {
						if (amount <= 0) return;
						if (eventKind === "approved") {
							debtSyncNotifier?.({
								kind: "payment_approved",
								amount,
								when: date,
								noteTitle: still.title,
							});
							return;
						}
						if (eventKind === "rejected") {
							debtSyncNotifier?.({
								kind: "payment_rejected",
								amount,
								when: date,
								noteTitle: still.title,
							});
							return;
						}
						if (!fromOther) return;
						if (status === "pending") {
							debtSyncNotifier?.({
								kind: "payment_pending",
								amount,
								who: still.counterpartyName || "Someone",
								when: date,
								noteTitle: still.title,
							});
							return;
						}
						debtSyncNotifier?.({
							kind: "payment",
							amount,
							who: still.counterpartyName || "Someone",
							when: date,
							noteTitle: still.title,
						});
					},
				),
			);

			stops.push(
				listenDebtLinkRemoval(still.linkId, async () => {
					const local = await db.debtNotes.where("linkId").equals(linkId).first();
					if (!local) return;
					const pays = await db.debtPayments
						.where("debtNoteId")
						.equals(local.id)
						.toArray();
					for (const p of pays) await db.debtPayments.delete(p.id);
					await db.debtNotes.delete(local.id);
					debtSyncNotifier?.({ kind: "removed" });
					window.dispatchEvent(new Event("app-debt-payments-changed"));
				}),
			);
		}

		stopGlobalDebtSync = () => {
			for (const stop of stops) stop();
			stopGlobalDebtSync = null;
		};
	})().finally(() => {
		refreshInFlight = null;
	});

	return refreshInFlight;
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

	void refreshGlobalDebtSync();
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
		title: String(link.title || link.lenderName || "Borrowed"),
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
	void refreshGlobalDebtSync();
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
		status: payment.status || "approved",
		updatedAt: new Date().toISOString(),
	});
	return paymentId;
}

export async function updateDebtPaymentCloud(
	linkId: string,
	cloudPaymentId: string,
	data: {
		amount?: number;
		date?: string;
		description?: string;
		status?: "pending" | "approved" | "rejected";
	},
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
	let changed = false;

	for (const docSnap of snap.docs) {
		const data = docSnap.data();
		const cloudPaymentId = String(data.paymentId || docSnap.id);
		const status =
			data.status === "pending" || data.status === "rejected"
				? data.status
				: "approved";
		const amount = Number(data.amount) || 0;
		const date = String(data.date || "");
		const description = String(data.description || "");
		const found = existing.find(
			(p) => p.cloudPaymentId === cloudPaymentId || p.id === cloudPaymentId,
		);
		if (found) {
			if (
				found.amount === amount &&
				found.date === date &&
				found.description === description &&
				(found.status || "approved") === status &&
				found.cloudPaymentId === cloudPaymentId
			) {
				continue;
			}
			await db.debtPayments.update(found.id, {
				amount,
				date,
				description,
				cloudPaymentId,
				status,
				syncedAt: new Date().toISOString(),
			});
			changed = true;
		} else {
			await db.debtPayments.put({
				id: cloudPaymentId,
				debtNoteId: localNoteId,
				amount,
				date,
				description,
				createdAt: String(data.createdAt || new Date().toISOString()),
				cloudPaymentId,
				createdByUid: String(data.createdByUid || ""),
				status,
				syncedAt: new Date().toISOString(),
			});
			changed = true;
		}
	}

	await db.debtNotes.update(localNoteId, { syncStatus: "linked" });
	if (changed) {
		window.dispatchEvent(new Event("app-debt-payments-changed"));
	}
}

export function listenDebtPayments(
	linkId: string,
	localNoteId: string,
	onRemotePayment?: (
		amount: number,
		fromOther: boolean,
		date: string,
		status: string,
		eventKind: "added" | "approved" | "rejected",
	) => void,
) {
	const known = new Set<string>();
	const knownStatus = new Map<string, string>();
	let ready = false;

	return onSnapshot(
		collection(firestore, "debtLinks", linkId, "payments"),
		async (snap) => {
			const user = firebaseAuth.currentUser;
			let notifyAmount = 0;
			let notifyFromOther = false;
			let notifyDate = "";
			let notifyStatus = "approved";
			let notifyEventKind: "added" | "approved" | "rejected" = "added";
			let changed = false;

			for (const change of snap.docChanges()) {
				const data = change.doc.data();
				const cloudPaymentId = String(data.paymentId || change.doc.id);
				const amount = Number(data.amount) || 0;
				const createdByUid = String(data.createdByUid || "");
				const fromOther = !!user && createdByUid !== user.uid;
				const status =
					data.status === "pending" || data.status === "rejected"
						? data.status
						: "approved";
				const date = String(data.date || "");
				const description = String(data.description || "");

				const existing = await db.debtPayments
					.where("debtNoteId")
					.equals(localNoteId)
					.toArray();

				if (change.type === "removed") {
					const found = existing.find(
						(p) => p.cloudPaymentId === cloudPaymentId || p.id === cloudPaymentId,
					);
					if (found) {
						await db.debtPayments.delete(found.id);
						changed = true;
					}
					known.delete(cloudPaymentId);
					knownStatus.delete(cloudPaymentId);
					continue;
				}

				const found = existing.find(
					(p) => p.cloudPaymentId === cloudPaymentId || p.id === cloudPaymentId,
				);
				if (found) {
					if (
						found.amount !== amount ||
						found.date !== date ||
						found.description !== description ||
						(found.status || "approved") !== status ||
						found.cloudPaymentId !== cloudPaymentId
					) {
						await db.debtPayments.update(found.id, {
							amount,
							date,
							description,
							cloudPaymentId,
							status,
							syncedAt: new Date().toISOString(),
						});
						changed = true;
					}
				} else {
					await db.debtPayments.put({
						id: cloudPaymentId,
						debtNoteId: localNoteId,
						amount,
						date,
						description,
						createdAt: String(data.createdAt || new Date().toISOString()),
						cloudPaymentId,
						createdByUid,
						status,
						syncedAt: new Date().toISOString(),
					});
					changed = true;
				}

				if (ready && change.type === "added" && !known.has(cloudPaymentId)) {
					notifyAmount = amount;
					notifyFromOther = fromOther;
					notifyDate = date;
					notifyStatus = status;
					notifyEventKind = "added";
				}

				if (ready && change.type === "modified" && user && createdByUid === user.uid) {
					const prev = knownStatus.get(cloudPaymentId);
					if (prev === "pending" && (status === "approved" || status === "rejected")) {
						notifyAmount = amount;
						notifyFromOther = true;
						notifyDate = date;
						notifyStatus = status;
						notifyEventKind = status;
					}
				}

				known.add(cloudPaymentId);
				knownStatus.set(cloudPaymentId, status);
			}

			if (!ready) {
				for (const d of snap.docs) {
					const id = String(d.data().paymentId || d.id);
					const st =
						d.data().status === "pending" || d.data().status === "rejected"
							? d.data().status
							: "approved";
					known.add(id);
					knownStatus.set(id, st);
				}
				ready = true;
			}

			if (notifyAmount > 0) {
				onRemotePayment?.(
					notifyAmount,
					notifyFromOther,
					notifyDate,
					notifyStatus,
					notifyEventKind,
				);
			}
			if (changed) {
				window.dispatchEvent(new Event("app-debt-payments-changed"));
			}
		},
		() => {
			/* permission / network — ignore */
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
	let seen = false;
	return onSnapshot(
		doc(firestore, "debtLinks", linkId),
		(snap) => {
			const removed = !snap.exists() || snap.data()?.status === "removed";
			if (!seen) {
				seen = true;
				if (removed) onRemoved();
				return;
			}
			if (removed) onRemoved();
		},
		() => {
			/* permission / network — do not treat as removed */
		},
	);
}
