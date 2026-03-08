import React, { useEffect, useState } from "react";
import "./HomePage.css";
import { waitForServer } from "../utils/pollBackend";
import { useAuth } from "../context/AuthContext";

function HomePage() {
	const { login } = useAuth();
	const [status, setStatus] = useState("idle"); // idle | connecting | connected | failed
	const [attempts, setAttempts] = useState(0);
	const [backendBody, setBackendBody] = useState(null);
	// Sign in / Sign up modal state
	const [showSignIn, setShowSignIn] = useState(false);
	const [showSignUp, setShowSignUp] = useState(false);

	const [signInUsername, setSignInUsername] = useState("");
	const [signInPassword, setSignInPassword] = useState("");
	const [signInShowPassword, setSignInShowPassword] = useState(false);

	const [signUpUsername, setSignUpUsername] = useState("");
	const [signUpPassword, setSignUpPassword] = useState("");
	const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("");
	const [signUpShowPassword, setSignUpShowPassword] = useState(false);

	const [resultModal, setResultModal] = useState({ open: false, title: "", message: "" });

	useEffect(() => {
		let mounted = true;
		// Use a relative path so Vite dev server can proxy and log the attempts in the terminal
		const backendPath = "/fe_access";

		setStatus("connecting");

		waitForServer(backendPath, {
			timeoutMs: 180_000, // 3 minutes
			intervalMs: 3_000,
			perRequestTimeoutMs: 5_000,
			expectedBody: "Frontend access detected",
			onAttempt: (n) => {
				if (!mounted) return;
				setAttempts(n);
			},
		})
			.then((result) => {
				if (!mounted) return;
				setStatus("connected");
				if (result && result.body != null) setBackendBody(result.body);
			})
			.catch(() => {
				if (!mounted) return;
				setStatus("failed");
			});

		return () => {
			mounted = false;
		};
	}, []);

	// Log status changes for easier debugging in dev console
	useEffect(() => {
		console.log(`[HomePage] backend status: ${status} (attempts: ${attempts})`);
	}, [status, attempts]);

	// Helpers to show result popups
	function openResult(title, message) {
		setResultModal({ open: true, title, message });
	}

	function closeResult() {
		setResultModal({ open: false, title: "", message: "" });
	}

	// Send sign in request
	async function handleSignInSubmit(e) {
		e && e.preventDefault();
		try {
			const res = await fetch('http://localhost:8081/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: signInUsername, password: signInPassword }),
			});

			let responseData = null;
			try { 
				const text = await res.text();
				responseData = text ? JSON.parse(text) : null;
			} catch (err) { 
				responseData = null;
			}

			if (res.status === 200 && responseData && responseData.success) {
				// successful sign in -> save token and redirect to welcome page
				setShowSignIn(false);
				// Store auth token and user info in context
				const token = responseData.data.token;
				const expiresIn = responseData.data.expiresIn;
				login({ username: signInUsername }, token, expiresIn);
				// Redirect to home
				setTimeout(() => {
					window.location.href = '/home';
				}, 100);
			} else {
				const errorMsg = responseData?.message || `Status ${res.status}`;
				openResult('Sign In Failed', errorMsg);
			}
		} catch (err) {
			openResult('Sign In Error', err && err.message ? err.message : String(err));
		}
	}

	// Send sign up request
	async function handleSignUpSubmit(e) {
		e && e.preventDefault();
		if (signUpPassword !== signUpPasswordConfirm) {
			openResult('Sign Up Error', 'Passwords do not match');
			return;
		}

		try {
			const res = await fetch('http://localhost:8081/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: signUpUsername, password: signUpPassword }),
			});

			let responseData = null;
			try { 
				const text = await res.text();
				responseData = text ? JSON.parse(text) : null;
			} catch (err) { 
				responseData = null;
			}

			if (res.status === 201 && responseData && responseData.success) {
				// On successful sign up, auto-login and redirect to home
				setShowSignUp(false);
				const token = responseData.data.token;
				const expiresIn = responseData.data.expiresIn;
				login({ username: signUpUsername }, token, expiresIn);
				setTimeout(() => {
					window.location.href = '/home';
				}, 100);
			} else {
				const errorMsg = responseData?.message || `Status ${res.status}`;
				openResult('Sign Up Failed', errorMsg);
			}
		} catch (err) {
			openResult('Sign Up Error', err && err.message ? err.message : String(err));
		}
	}

	return (
		<div className="homepage">
			<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
				<div className="button-container">
					<button className="btn sign-in" onClick={() => setShowSignIn(true)}>Sign In</button>
					<button className="btn sign-up" onClick={() => setShowSignUp(true)}>Sign Up</button>
				</div>
			</div>

			{/* Sign In Modal */}
			{showSignIn && (
				<div className="modal-overlay" onClick={() => setShowSignIn(false)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<h3>Sign In</h3>
						<form onSubmit={handleSignInSubmit}>
							<label>
								Username
								<div className="input-field">
									<input value={signInUsername} onChange={(e) => setSignInUsername(e.target.value)} />
									<div className="eye-btn invisible"></div>
								</div>
							</label>
							<label className="password-row">
								Password
								<div className="password-field">
									<input type={signInShowPassword ? 'text' : 'password'} value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} />
							</div>
						</label>

						<div className="modal-actions">
							<button type="button" className="btn cancel" onClick={() => setShowSignIn(false)}>Cancel</button>
							<button type="submit" className="btn primary">Sign In</button>
						</div>
					</form>
				</div>
			</div>
		)}

		{/* Sign Up Modal */}
		{showSignUp && (
			<div className="modal-overlay" onClick={() => setShowSignUp(false)}>
				<div className="modal" onClick={(e) => e.stopPropagation()}>
					<h3>Sign Up</h3>
					<form onSubmit={handleSignUpSubmit}>
						<label>
							Username
							<div className="input-field">
								<input value={signUpUsername} onChange={(e) => setSignUpUsername(e.target.value)} />
								<div className="eye-btn invisible"></div>
							</div>
							<div className="input-guidance">
								<ul>
									<li>Can only contain letters, numbers, and underscores</li>
									<li>Must be at least 3 characters</li>
									<li>Must be at most 50 characters</li>
								</ul>
							</div>
						</label>
						<label>
							Password
							<div className="password-field">
								<input type={signUpShowPassword ? 'text' : 'password'} value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
							</div>
							<div className="input-guidance">
								<ul>
									<li>Must contain at least one uppercase letter</li>
									<li>Must contain at least one lowercase letter</li>
									<li>Must contain at least one number</li>
									<li>Must contain at least one special character</li>
									<li>Must be at least 6 characters</li>
								</ul>
							</div>
						</label>
						<label>
							Confirm Password
							<div className="password-field">
								<input type={signUpShowPassword ? 'text' : 'password'} value={signUpPasswordConfirm} onChange={(e) => setSignUpPasswordConfirm(e.target.value)} />
							</div>
						</label>

						<div className="modal-actions">
							<button type="button" className="btn cancel" onClick={() => setShowSignUp(false)}>Cancel</button>
							<button type="submit" className="btn primary">Sign Up</button>
						</div>
					</form>
				</div>
			</div>
		)}

		{/* Loading Modal */}
		{status === "connecting" && (
			<div className="modal-overlay">
				<div className="modal loading-modal" onClick={(e) => e.stopPropagation()}>
					<h3>Connecting to Server</h3>
					<div className="loading-spinner"></div>
					<p>Attempt {attempts}...</p>
				</div>
			</div>
		)}

		{/* Result Modal */}
		{resultModal.open && (
			<div className="modal-overlay" onClick={closeResult}>
				<div className="modal" onClick={(e) => e.stopPropagation()}>
					<h3>{resultModal.title}</h3>
					<pre className="result-message">{resultModal.message}</pre>
					<div className="modal-actions">
						<button className="btn primary" onClick={closeResult}>OK</button>
					</div>
				</div>
			</div>
		)}
	</div>
	);
}

export default HomePage;
