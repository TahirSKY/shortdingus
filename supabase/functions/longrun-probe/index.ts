// Temporary diagnostic: does a silent stream or a long stream get cut off?
Deno.serve((req) => {
  const u = new URL(req.url);
  const secs = Number(u.searchParams.get("secs") || 90);
  const beat = u.searchParams.get("beat") === "1";
  const start = Date.now();
  const stream = new ReadableStream({
    async start(ctl) {
      const enc = new TextEncoder();
      ctl.enqueue(enc.encode("start\n"));
      while (Date.now() - start < secs * 1000) {
        await new Promise((r) => setTimeout(r, 5000));
        if (beat) ctl.enqueue(enc.encode(`t=${Math.round((Date.now() - start) / 1000)}\n`));
      }
      ctl.enqueue(enc.encode(`done ${Math.round((Date.now() - start) / 1000)}s\n`));
      ctl.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" } });
});
