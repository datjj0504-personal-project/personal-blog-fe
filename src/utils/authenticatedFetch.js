/**
 * Wrapper around fetch to automatically include the auth token in requests
 * @param {string} url - The URL to fetch from
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
	const token = localStorage.getItem('authToken');
	
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};
	
	// Add token to Authorization header if available
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	
	return fetch(url, {
		...options,
		headers,
	});
}
