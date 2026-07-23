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

		const amount = Math.round(Number(payment.amount) || 0).toLocaleString(
			"en-PH",
		);

		await sendToUser(
			targetUid,
			{
				title: "Debt Note payment",
				body: `₱${amount} was recorded on a linked debt.`,
			},
			{
				type: "debt_payment",
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
