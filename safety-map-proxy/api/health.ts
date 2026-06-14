// safety-map-proxy/api/health.ts
export const config = { runtime: 'edge' };

export default function handler(req: Request) {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}