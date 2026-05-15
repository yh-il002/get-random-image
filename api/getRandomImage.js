export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body =
    typeof req.body === "string"
      ? Object.fromEntries(new URLSearchParams(req.body))
      : req.body;

  const query = body.text?.trim();
  if (!query) {
    return res.status(200).json({
      response_type: "ephemeral",
      text: "使い方: /get <検索ワード>",
    });
  }

  try {
    const bingRes = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
        },
      }
    );
    const html = await bingRes.text();

    // Bing の HTML に埋め込まれた画像 URL を抽出
    // 例: <a class="iusc" m='{"murl":"https://...","turl":"..."}'>
    const imageUrls = [...html.matchAll(/"murl":"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);

    if (!imageUrls.length) {
      console.error("No images found. HTML head:", html.slice(0, 500));
      return res.status(200).json({
        response_type: "ephemeral",
        text: `「${query}」の画像が見つかりませんでした。`,
      });
    }

    const imageUrl = imageUrls[Math.floor(Math.random() * Math.min(imageUrls.length, 20))];

    return res.status(200).json({
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${query}* の画像` },
        },
        {
          type: "image",
          image_url: imageUrl,
          alt_text: query,
        },
      ],
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(200).json({
      response_type: "ephemeral",
      text: "画像の取得に失敗しました。しばらくしてから再試行してください。",
    });
  }
}
