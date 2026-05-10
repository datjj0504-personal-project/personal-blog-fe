/**
 * Wrapper around fetch to automatically include the auth token in requests
 * @param {string} url - The URL to fetch from
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
	const token = sessionStorage.getItem('authToken');
	
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};
	
	// Add token to Authorization header if available
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	// Log request details for debugging
	let requestBody = options.body;
	try {
		if (typeof requestBody === 'string') {
			requestBody = JSON.parse(requestBody);
		}
	} catch (err) {
		// keep original body if not JSON
	}
	console.log('[authenticatedFetch] request:', {
		url,
		method: options.method || 'GET',
		body: requestBody,
	});
	
	const res = await fetch(url, {
		...options,
		headers,
	});

	// Log response details for debugging
	let responseBody = null;
	try {
		const text = await res.clone().text();
		responseBody = text ? JSON.parse(text) : text;
	} catch (err) {
		responseBody = null;
	}
	console.log('[authenticatedFetch] response:', {
		url,
		status: res.status,
		ok: res.ok,
		body: responseBody,
	});

	return res;
}
