function randomBytes(length: number): BufferSource {
	return crypto.getRandomValues(new Uint8Array(length)) as BufferSource
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let str = ''
	for (const b of bytes) str += String.fromCharCode(b)
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
	const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
	const str = atob(base64 + pad)
	const bytes = new Uint8Array(str.length)
	for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
	return bytes.buffer
}

export async function canUseBiometric(): Promise<boolean> {
	if (!window.isSecureContext || !window.PublicKeyCredential) return false
	try {
		return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
	} catch {
		return false
	}
}

/** Register Face ID / Touch ID via WebAuthn (PWA). Returns credential id or null. */
export async function registerBiometric(): Promise<string | null> {
	try {
		const credential = (await navigator.credentials.create({
			publicKey: {
				challenge: randomBytes(32),
				rp: {
					name: 'PocketFlow',
					id: location.hostname,
				},
				user: {
					id: randomBytes(16),
					name: 'pocketflow-user',
					displayName: 'PocketFlow User',
				},
				pubKeyCredParams: [
					{ type: 'public-key', alg: -7 },
					{ type: 'public-key', alg: -257 },
				],
				authenticatorSelection: {
					authenticatorAttachment: 'platform',
					userVerification: 'required',
					residentKey: 'preferred',
				},
				timeout: 60000,
			},
		})) as PublicKeyCredential | null

		if (!credential) return null
		return bufferToBase64Url(credential.rawId)
	} catch {
		return null
	}
}

export async function unlockWithBiometric(credentialId: string): Promise<boolean> {
	if (!credentialId) return false
	try {
		const assertion = await navigator.credentials.get({
			publicKey: {
				challenge: randomBytes(32),
				allowCredentials: [
					{
						type: 'public-key',
						id: base64UrlToBuffer(credentialId),
						transports: ['internal'],
					},
				],
				userVerification: 'required',
				timeout: 60000,
			},
		})
		return !!assertion
	} catch {
		return false
	}
}
