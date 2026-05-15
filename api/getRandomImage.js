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
      text: "使い方: /getimage <検索ワード>",
    });
  }

  try {
    // Step 1: DuckDuckGo のページから vqd トークンを取得
    const ddgPage = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    const html = await ddgPage.text();
    const vqdMatch = html.match(/vqd=["']?([\d-]+)/);
    if (!vqdMatch) throw new Error("vqd token not found");

    // Step 2: 画像検索結果を取得
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqdMatch[1]}&p=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://duckduckgo.com/",
        },
      }
    );
    const { results } = await imgRes.json();

    if (!results?.length) {
      return res.status(200).json({
        response_type: "ephemeral",
        text: `「${query}」の画像が見つかりませんでした。`,
      });
    }

    const item = results[Math.floor(Math.random() * Math.min(results.length, 20))];

    return res.status(200).json({
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${query}* の画像` },
        },
        {
          type: "image",
          image_url: item.image,
          alt_text: item.title || query,
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
