import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		// plugin to log proxy requests to /datnt/blog/server in the terminal
		(() => ({
			name: 'log-backend-requests',
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					try {
						if (req && req.url && req.url.startsWith('/datnt/blog/server')) {
							const remote = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
							console.log(`[vite:backend] ${req.method} ${req.url} from ${remote}`);
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
			'/datnt/blog/server': {
				target: 'http://localhost:8081',
				changeOrigin: true,
				// keep path intact so backend receives /datnt/blog/server/... requests
				rewrite: (path) => path,
			},
		},
	},
})
