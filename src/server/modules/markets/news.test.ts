import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

function rssXml(items: { title: string; link: string; pubDate: string }[]): string {
  const itemsXml = items
    .map((i) => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${i.pubDate}</pubDate></item>`)
    .join("");
  return `<?xml version="1.0"?><rss><channel><title>Feed</title>${itemsXml}</channel></rss>`;
}

function textResponse(body: string, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getNewsCategory", () => {
  it("combina y ordena por fecha los items de los feeds de la categoría", async () => {
    const { getNewsCategory } = await import("./news");
    fetchMock
      .mockResolvedValueOnce(
        textResponse(rssXml([{ title: "Antigua", link: "https://a.test/1", pubDate: "Mon, 01 Jan 2026 00:00:00 +0000" }])),
      )
      .mockResolvedValueOnce(
        textResponse(rssXml([{ title: "Reciente", link: "https://b.test/1", pubDate: "Mon, 19 Oct 2026 00:00:00 +0000" }])),
      );

    const result = await getNewsCategory("crypto");

    expect(result.error).toBeNull();
    expect(result.items.map((i) => i.title)).toEqual(["Reciente", "Antigua"]);
  });

  it("todos los feeds caídos: devuelve items vacío y el motivo, no lanza", async () => {
    vi.resetModules();
    const { getNewsCategory } = await import("./news");
    fetchMock.mockResolvedValue(textResponse("", false, 500));

    const result = await getNewsCategory("stocks");

    expect(result.items).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it("decodifica referencias de carácter HTML en el título (p. ej. &#x2019;)", async () => {
    vi.resetModules();
    const { getNewsCategory } = await import("./news");
    fetchMock.mockResolvedValue(
      textResponse(rssXml([{ title: "I&#x2019;m 63", link: "https://x.test", pubDate: "Mon, 19 Oct 2026 00:00:00 +0000" }])),
    );

    const result = await getNewsCategory("stocks");

    expect(result.items[0]!.title).toBe("I’m 63");
  });

  it("no vuelve a llamar a los feeds dentro de la ventana de caché", async () => {
    vi.resetModules();
    const { getNewsCategory } = await import("./news");
    fetchMock.mockResolvedValue(textResponse(rssXml([{ title: "X", link: "https://x.test", pubDate: "Mon, 19 Oct 2026 00:00:00 +0000" }])));

    await getNewsCategory("stocks");
    fetchMock.mockClear();
    await getNewsCategory("stocks");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
