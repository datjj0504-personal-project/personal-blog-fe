import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		// plugin to log proxy requests to /fe_access in the terminal
		(() => ({
			name: 'log-fe-access-requests',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					try {
						if (req && req.url && req.url.startsWith('/fe_access')) {
							const remote = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
							// prints in the terminal where `npm run dev` is running
							// note: keep logs lightweight to avoid noisy output
							console.log(`[vite:fe-access] ${req.method} ${req.url} from ${remote}`);
						}
					} catch (e) {
						// ignore logging errors
					}
					next();
				});
			},
		}))(),
	],
	server: {
		port: 8082, // 👈 chính là chỗ config cổng
		proxy: {
			// forward requests from the dev server to the backend to avoid CORS
			'/fe_access': {
				target: 'http://localhost:8081',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/fe_access/, '/fe_access'),
			},
		},
	},
})
