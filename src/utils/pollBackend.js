// Utility to poll a backend URL until it responds or a timeout is reached.
// - url: full URL to poll (e.g. http://localhost:8081/)
// - options: { timeoutMs, intervalMs, perRequestTimeoutMs, onAttempt }
export async function waitForServer(url, options = {}) {
  const {
    timeoutMs = 180_000, // total timeout (3 minutes)
    intervalMs = 3_000, // wait between attempts
    perRequestTimeoutMs = 5_000, // per-request abort timeout
    onAttempt,
    // If provided, the response body (string) must exactly match this to consider success
    expectedBody = null,
    // Optional validator for response success, receives (res, bodyText) and returns true/false
    validateResponse = null,
  } = options;

  const start = Date.now();
  let attempts = 0;

  console.info(`[pollBackend] start polling ${url} (timeout ${timeoutMs}ms, interval ${intervalMs}ms)`);

  while (Date.now() - start < timeoutMs) {
    attempts += 1;
    if (typeof onAttempt === 'function') {
      try { onAttempt(attempts); } catch (e) { /* ignore */ }
    }

    console.debug(`[pollBackend] attempt #${attempts} to ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), perRequestTimeoutMs);

      // Use GET; caller can point to any health route. Disable caching to avoid stale responses.
      const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res) {
        // read body as text for optional matching / debugging (even on non-ok)
        let bodyText = null;
        try {
          bodyText = await res.text();
        } catch (err) {
          console.debug(`[pollBackend] failed to read body on attempt #${attempts}: ${err && err.message}`);
        }
        console.log('[pollBackend] response:', {
          status: res.status,
          ok: res.ok,
          body: bodyText,
        });

        if (res.ok && typeof validateResponse === 'function') {
          let valid = false;
          try {
            valid = await validateResponse(res, bodyText);
          } catch (err) {
            console.debug(`[pollBackend] validateResponse threw on attempt #${attempts}: ${err && err.message}`);
          }
          if (valid) {
            console.info(`[pollBackend] success on attempt #${attempts} via validateResponse`);
            return { res, attempts, body: bodyText };
          }
          console.debug(`[pollBackend] validateResponse failed on attempt #${attempts}`);
        }

        if (res.ok && expectedBody == null && typeof validateResponse !== 'function') {
          console.info(`[pollBackend] success on attempt #${attempts} (status ${res.status})`);
          return { res, attempts, body: bodyText };
        }

        if (res.ok && expectedBody != null) {
          // Compare trimmed strings to be a bit more forgiving about trailing newlines/spaces
          const got = (bodyText || '').trim();
          const want = String(expectedBody).trim();
          if (got === want) {
            console.info(`[pollBackend] expected body matched on attempt #${attempts}`);
            return { res, attempts, body: bodyText };
          } else {
            console.debug(`[pollBackend] body mismatch on attempt #${attempts} (got: "${got}", want: "${want}")`);
          }
        }
      } else {
        console.debug(`[pollBackend] non-ok response on attempt #${attempts} (status ${res && res.status})`);
      }
    } catch (err) {
      // fetch failed or aborted => try again after interval
      console.debug(`[pollBackend] attempt #${attempts} failed: ${err && err.message}`);
    }

    // wait before next attempt (but don't overshoot the global timeout)
    const timeLeft = timeoutMs - (Date.now() - start);
    if (timeLeft <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(intervalMs, timeLeft)));
  }

  throw new Error(`Timeout waiting for server at ${url} after ${timeoutMs}ms`);
}
