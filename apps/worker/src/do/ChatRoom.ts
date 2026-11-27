// Durable Object for chat coordination + WebSocket handling (Cloudflare Workers).
// Binding needed (Agent C, wrangler.jsonc): durable_objects.bindings = [{ name: "CHAT_ROOM", class_name: "ChatRoom" }]
//   and [[migrations]] tag v1 with new_classes = ["ChatRoom"].
// Local dev fallback: the Node server does NOT run Durable Objects; it uses
// the in-memory/long-poll endpoint GET /api/conversations/:id/poll (see
// routes/messages.ts) and plain HTTP send/list. Do NOT claim live DO deployment.
export interface ChatState { storage?: any; blockConcurrencyWhile?: (fn: () => Promise<unknown>) => Promise<unknown> }
export class ChatRoom {
  private sessions = new Set<any>();
  constructor(private state: ChatState, private env: Record<string, unknown>) {}
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') === 'websocket') {
      // @ts-ignore WebSocketPair is a Workers runtime global
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [any, any];
      server.accept();
      this.sessions.add(server);
      server.addEventListener('message', (evt: MessageEvent) => {
        // Broadcast to other sessions in this room (typing / new-message hints).
        for (const s of this.sessions) { if (s !== server) { try { s.send(typeof evt.data === 'string' ? evt.data : String(evt.data)); } catch {} } }
      });
      const close = () => this.sessions.delete(server);
      server.addEventListener('close', close); server.addEventListener('error', close);
      return new Response(null, { status: 101, webSocket: client } as any);
    }
    if (url.pathname.endsWith('/broadcast') && request.method === 'POST') {
      const body = await request.text();
      for (const s of this.sessions) { try { s.send(body); } catch {} }
      return Response.json({ ok: true, data: { delivered: this.sessions.size } });
    }
    return Response.json({ ok: true, data: { sessions: this.sessions.size } });
  }
}
