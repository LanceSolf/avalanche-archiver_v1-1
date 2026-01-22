/**
 * Cloudflare Worker for Avalanche Archiver Uploads
 * 
 * Setup:
 * 1. Create a KV Namespace and bind it as 'UPLOADS'
 * 2. (Optional) set an ADMIN_Key in secrets if you want to protect deletions
 * 
 * API:
 * - POST /upload: JSON body { user, location, comment, lat, lon, image (base64) }
 * - GET /list: Returns all uploads
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // LIST UPLOADS
        if (request.method === "GET" && url.pathname === "/list") {
            try {
                const list = await env.UPLOADS.list();
                const uploads = [];
                for (const key of list.keys) {
                    const val = await env.UPLOADS.get(key.name, { type: "json" });
                    if (val) uploads.push(val);
                }
                return new Response(JSON.stringify(uploads), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // GET SINGLE UPLOAD
        if (request.method === "GET" && url.pathname === "/get") {
            const id = url.searchParams.get('id');
            if (!id) return new Response("Missing ID", { status: 400, headers: corsHeaders });

            try {
                const val = await env.UPLOADS.get(id, { type: "json" });
                if (!val) return new Response("Not Found", { status: 404, headers: corsHeaders });

                return new Response(JSON.stringify(val), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (request.method === "POST" && url.pathname === "/delete") {
            try {
                const data = await request.json();
                if (!data.id) {
                    return new Response("Missing ID", { status: 400, headers: corsHeaders });
                }

                await env.UPLOADS.delete(data.id);
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // HANDLE UPLOAD
        if (request.method === "POST" && url.pathname === "/upload") {
            try {
                const data = await request.json();

                // Basic Validation
                if (!data.image && !data.comment && (!data.images || data.images.length === 0)) {
                    return new Response("Missing content", { status: 400, headers: corsHeaders });
                }

                // Use existing ID if provided (for edits), otherwise generate new
                const id = data.id || Date.now().toString();

                const uploadRecord = {
                    id: id,
                    date: data.date || new Date().toISOString(),
                    user: data.user || "Anonymous",
                    location: data.location || "Unknown",
                    comment: data.comment || "",
                    lat: data.lat || null,
                    lon: data.lon || null,
                    elevation: data.elevation || null,
                    aspect: data.aspect || null,
                    type: data.type || 'generic',
                    images: data.images || (data.image ? [data.image] : []), // Array of Base64 strings
                    layers: data.layers || [], // Store raw snow profile layers
                    tests: data.tests || [], // Store stability tests
                    approved: true // Auto-approve for now, change logic if needed
                };

                // Store in KV
                // CRITICAL: Do NOT set an expirationTtl here.
                // Retention is handled by the build script (Application Layer). 
                // We must keep raw data PERMANENTLY because some items are linked to Incidents and must never expire.
                await env.UPLOADS.put(id, JSON.stringify(uploadRecord));

                return new Response(JSON.stringify({ success: true, id: id }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });

            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};
