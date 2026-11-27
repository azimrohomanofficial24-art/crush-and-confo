// Cloudflare Workers entry (wrangler-compatible). Agent C owns wrangler.jsonc;
// required bindings: D1 database `DB`, Durable Object `CHAT_ROOM` (class ChatRoom),
// KV `CACHE` (optional, for rate limiting / cache), R2 `UPLOADS` (optional).
import { createApp } from './app.js';
import { ChatRoom } from './do/ChatRoom.js';
import type { Env } from './db/index.js';
export { ChatRoom };
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    // WebSocket upgrade for a chat room goes to the Durable Object.
    if (url.pathname.startsWith('/api/chat/')) {
      const roomId = url.pathname.split('/')[3] ?? 'default';
      const id = (env as any).CHAT_ROOM?.idFromName(roomId);
      if (id) { const stub = (env as any).CHAT_ROOM.get(id); return stub.fetch(request); }
      return Response.json({ ok: false, error: { code: 'unavailable', message: 'Chat Durable Object is not bound in this environment' } }, { status: 503 });
    }
    const app = createApp(env);
    return app.fetch(request, env, ctx);
  },
};
