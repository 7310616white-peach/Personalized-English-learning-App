// Launch Vite with this Node runtime; does not install dependencies or modify PATH.
import { createServer } from 'vite';
const server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } });
await server.listen();
server.printUrls();
