import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

function lookup(reference: string, translation: string) {
  return GET(new Request(`http://localhost/api/verse?${new URLSearchParams({ reference, translation })}`));
}

afterEach(() => vi.unstubAllGlobals());

it("uses the requested translation and returns the canonical reference with its text", async () => {
  const fetch = vi.fn(async () => Response.json({
    reference: "John 3:16–17",
    text: "  Test passage text.\n",
    translation_id: "web",
  }));
  vi.stubGlobal("fetch", fetch);

  const response = await lookup("Jn 3:16-17", "WEB");

  expect(response.status).toBe(200);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("?translation=web"), expect.anything());
  expect(await response.json()).toEqual({
    reference: "John 3:16–17", translation: "WEB", text: "Test passage text.",
  });
});

it("never labels another translation or a throttled response as a successful lookup", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ reference: "Mark 1:1", text: "Test passage.", translation_id: "kjv" }))
    .mockResolvedValueOnce(new Response(null, { status: 429 }));
  vi.stubGlobal("fetch", fetch);

  expect((await lookup("Mark 1:1", "WEB")).status).toBe(502);
  expect((await lookup("Mark 1:2", "KJV")).status).toBe(502);
});
