const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const {
	onDocumentCreated,
	onDocumentUpdated,
} = require("firebase-functions/v2/firestore");

initializeApp();

async function sendToUser(uid, notification, data) {
	if (!uid) return;
	const userSnap = await getFirestore().collection("users").doc(uid).get();
	if (!userSnap.exists) return;
	const tokens = userSnap.data().fcmTokens || [];
	if (!tokens.length) return;

	const response = await getMessaging().sendEachForMulticast({
		tokens,
		notification,
		data,
		webpush: {
			fcmOptions: {
				link: "/me/debt-note",
			},
		},
	});

	const bad = [];
	response.responses.forEach((res, index) => {
		if (!res.success) bad.push(tokens[index]);
	});
	if (bad.length) {
		const next = tokens.filter((t) => !bad.includes(t));
		await getFirestore().collection("users").doc(uid).set(
			{ fcmTokens: next, updatedAt: new Date().toISOString() },
			{ merge: true },
		);
	}
}

function formatPaymentWhen(dateRaw) {
	if (!dateRaw) return "";
	const d = new Date(String(dateRaw) + "T00:00:00");
	if (Number.isNaN(d.getTime())) return String(dateRaw);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatPaymentAmount(amount) {
	return Math.round(Number(amount) || 0).toLocaleString("en-PH");
}

exports.onDebtPaymentCreated = onDocumentCreated(
	"debtLinks/{linkId}/payments/{paymentId}",
	async (event) => {
		const payment = event.data && event.data.data();
		if (!payment) return;

		const linkId = event.params.linkId;
		const linkSnap = await getFirestore().collection("debtLinks").doc(linkId).get();
		if (!linkSnap.exists) return;
		const link = linkSnap.data();

		const creator = payment.createdByUid;
		const targetUid =
			creator === link.lenderUid ? link.borrowerUid : link.lenderUid;
		if (!targetUid) return;

		const amount = formatPaymentAmount(payment.amount);
		const who =
			creator === link.lenderUid
				? link.lenderName || "Someone"
				: link.borrowerName || "Someone";
		const when = formatPaymentWhen(payment.date);
		const debtTitle = link.title || "linked debt";
		const isPending = payment.status === "pending";

		const title = isPending ? "Payment needs approval" : "Debt Note payment";
		const body = isPending
			? when
				? `${who} submitted ₱${amount} on ${when} for ${debtTitle}.`
				: `${who} submitted ₱${amount} for ${debtTitle}.`
			: when
				? `${who} recorded ₱${amount} on ${when} for ${debtTitle}.`
				: `${who} recorded ₱${amount} for ${debtTitle}.`;

		await sendToUser(
			targetUid,
			{ title, body },
			{
				type: isPending ? "debt_payment_pending" : "debt_payment",
				linkId: String(linkId),
				paymentId: String(event.params.paymentId),
			},
		);
	},
);

exports.onDebtPaymentUpdated = onDocumentUpdated(
	"debtLinks/{linkId}/payments/{paymentId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();
		if (!before || !after) return;
		if (before.status === after.status) return;
		if (after.status !== "approved" && after.status !== "rejected") return;
		if (before.status !== "pending") return;

		const linkId = event.params.linkId;
		const linkSnap = await getFirestore().collection("debtLinks").doc(linkId).get();
		if (!linkSnap.exists) return;
		const link = linkSnap.data();

		const targetUid = after.createdByUid;
		if (!targetUid) return;

		const amount = formatPaymentAmount(after.amount);
		const when = formatPaymentWhen(after.date);
		const debtTitle = link.title || "linked debt";
		const approved = after.status === "approved";

		const title = approved ? "Payment approved" : "Payment rejected";
		const body = approved
			? when
				? `Your ₱${amount} payment on ${when} for ${debtTitle} was approved.`
				: `Your ₱${amount} payment for ${debtTitle} was approved.`
			: when
				? `Your ₱${amount} payment on ${when} for ${debtTitle} was rejected.`
				: `Your ₱${amount} payment for ${debtTitle} was rejected.`;

		await sendToUser(
			targetUid,
			{ title, body },
			{
				type: approved ? "debt_payment_approved" : "debt_payment_rejected",
				linkId: String(linkId),
				paymentId: String(event.params.paymentId),
			},
		);
	},
);

exports.onDebtLinkUpdated = onDocumentUpdated(
	"debtLinks/{linkId}",
	async (event) => {
		const before = event.data.before.data();
		const after = event.data.after.data();
		if (!before || !after) return;
		if (before.status === "removed" || after.status !== "removed") return;

		const remover = after.removedByUid;
		const targetUid =
			remover === after.lenderUid ? after.borrowerUid : after.lenderUid;
		if (!targetUid) return;

		await sendToUser(
			targetUid,
			{
				title: "Debt Note removed",
				body: "A linked debt entry was removed.",
			},
			{
				type: "debt_removed",
				linkId: String(event.params.linkId),
			},
		);
	},
);
