import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import BlogHome from "./pages/BlogHome";

function AppContent() {
	const path = typeof window !== 'undefined' ? window.location.pathname : '/';
	
	if (path === '/home') {
		return (
			<ProtectedRoute>
				<BlogHome />
			</ProtectedRoute>
		);
	}
	
	return <HomePage />;
}

function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	);
}

export default App;
