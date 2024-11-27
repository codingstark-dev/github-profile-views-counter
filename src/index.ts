import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono<{ Bindings: Env }>();
interface Env {
  AI: Ai;
  DB: D1Database;
  RATELIMIT_KV: KVNamespace;
}
app.get("/", (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Badge Generator</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .preview {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .controls {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
          }
          .controls label {
            display: block;
            margin-bottom: 5px;
          }
          .url-box {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            font-family: monospace;
          }
          button {
            padding: 8px 16px;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background: #0255b3;
          }
          .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }
          .tabs button {
            background: #eee;
            color: #333;
          }
          .tabs button.active {
            background: #0366d6;
            color: white;
          }
        </style>
      </head>
      <body>
        <h1>Badge Generator</h1>
        
        <div class="tabs">
          <button onclick="switchTab('visitor')" class="active">Visitor Badge</button>
          <button onclick="switchTab('ai')">AI Badge</button>
        </div>

        <div id="visitor-tab">
          <div class="controls">
            <div>
              <label>Repository:</label>
              <input type="text" id="repo" placeholder="username/repo" />
            </div>
            <div>
              <label>Style:</label>
              <select id="style">
                <option value="flat">Flat</option>
                <option value="flat-square">Flat Square</option>
                <option value="plastic">Plastic</option>
                <option value="for-the-badge">For the Badge</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label>Color:</label>
              <input type="text" id="color" value="blue" />
            </div>
            <div>
              <label>Label:</label>
              <input type="text" id="label" value="Profile views" />
            </div>
          </div>
        </div>

        <div id="ai-tab" style="display:none">
          <div class="controls">
            <div>
              <label>Prompt:</label>
              <input type="text" id="prompt" placeholder="Generate a message..." />
            </div>
            <div>
              <label>Style:</label>
              <select id="ai-style">
                <option value="flat">Flat</option>
                <option value="flat-square">Flat Square</option>
                <option value="plastic">Plastic</option>
                <option value="for-the-badge">For the Badge</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label>Color:</label>
              <input type="text" id="ai-color" value="blue" />
            </div>
          </div>
        </div>

        <div class="preview">
          <h3>Preview:</h3>
          <img id="preview" src="" alt="Badge preview" />
        </div>

        <input type="text" id="url" class="url-box" readonly />
        <button onclick="copyUrl()">Copy URL</button>

        <script>
          let currentTab = 'visitor';
          
          function updatePreview() {
            const baseUrl = window.location.origin;
            let url;
            
            if (currentTab === 'visitor') {
              const repo = document.getElementById('repo').value || 'username/repo';
              const style = document.getElementById('style').value;
              const color = document.getElementById('color').value;
              const label = document.getElementById('label').value;
              
              url = \`\${baseUrl}/visitor-badge/\${repo}?style=\${style}&color=\${color}&label=\${encodeURIComponent(label)}\`;
            } else {
              const prompt = document.getElementById('prompt').value || 'Generate a message';
              const style = document.getElementById('ai-style').value;
              const color = document.getElementById('ai-color').value;
              
              url = \`\${baseUrl}/ai-badge?prompt=\${encodeURIComponent(prompt)}&style=\${style}&color=\${color}\`;
            }
            
            document.getElementById('preview').src = url;
            document.getElementById('url').value = url;
          }

          function switchTab(tab) {
            currentTab = tab;
            document.getElementById('visitor-tab').style.display = tab === 'visitor' ? 'block' : 'none';
            document.getElementById('ai-tab').style.display = tab === 'ai' ? 'block' : 'none';
            
            const tabs = document.querySelectorAll('.tabs button');
            tabs.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            updatePreview();
          }

          function copyUrl() {
            const urlInput = document.getElementById('url');
            urlInput.select();
            document.execCommand('copy');
          }

          // Add event listeners to all inputs
          document.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', updatePreview);
          });

          // Initial preview
          updatePreview();
        </script>
      </body>
    </html>
  `);
});

function getErrorBadgeSVG(message: string) {
  return getBadgeSVG(0, {
    label: "Error: Too many requests",
    color: "red",
    labelColor: "gray",
    style: "flat",
    message: message,
  });
}

const commonHeaders = {
  "Content-Type": "image/svg+xml",
  "Cache-Control": "no-cache, max-age=0, must-revalidate",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
  "x-content-type-options": "nosniff",
  "x-frame-options": "deny",
  "x-xss-protection": "1; mode=block",
  "Access-Control-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  Pragma: "no-cache",
  Expires: "0",
};

async function rateLimit(c: any, next: () => Promise<any>) {
  const ip = c.req.raw.headers.get("cf-connecting-ip") || "unknown";
  const KEY_PREFIX = "ratelimit:";
  const LIMIT = 60;
  const WINDOW = 60;

  try {
    const key = `${KEY_PREFIX}${ip}`;
    const currentValue = await c.env.RATELIMIT_KV.get(key);
    const now = Math.floor(Date.now() / 1000);

    let count: number;
    let resetTime: number;

    if (!currentValue) {
      count = 1;
      resetTime = now + WINDOW;
      await c.env.RATELIMIT_KV.put(key, JSON.stringify({ count, resetTime }), {
        expirationTtl: WINDOW,
      });
    } else {
      const data = JSON.parse(currentValue);
      if (now > data.resetTime) {
        count = 1;
        resetTime = now + WINDOW;
      } else {
        count = data.count + 1;
        resetTime = data.resetTime;
      }

      await c.env.RATELIMIT_KV.put(key, JSON.stringify({ count, resetTime }), {
        expirationTtl: WINDOW,
      });
    }

    if (count > LIMIT) {
      const remainingTime = resetTime - now;
      return new Response(getErrorBadgeSVG("Rate Limited"), {
        status: 429,
        headers: {
          ...commonHeaders,
          "X-RateLimit-Limit": LIMIT.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetTime.toString(),
          "Retry-After": remainingTime.toString(),
        },
      });
    }

    const response = await next();
    const headers = new Headers(response.headers);

    Object.entries(commonHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    });

    headers.set("X-RateLimit-Limit", LIMIT.toString());
    headers.set("X-RateLimit-Remaining", (LIMIT - count).toString());
    headers.set("X-RateLimit-Reset", resetTime.toString());

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Rate limit error:", error);
    return new Response(getErrorBadgeSVG("Rate Limit Error"), {
      headers: commonHeaders,
    });
  }
}

interface BadgeStyle {
  label?: string;
  style?: "flat" | "flat-square" | "plastic" | "for-the-badge" | "social";
  color?: string;
  labelColor?: string;
  logo?: string;
  logoWidth?: number;
  scale?: number;
  format?: "svg" | "json";
  message?: string;
}

const namedColors: { [key: string]: string } = {
  brightgreen: "44cc11",
  green: "97ca00",
  yellow: "dfb317",
  yellowgreen: "a4a61d",
  orange: "fe7d37",
  red: "e05d44",
  blue: "007ec6",
  grey: "555",
  gray: "555",
  lightgrey: "9f9f9f",
  lightgray: "9f9f9f",
};

function getBadgeSVG(count: number, options: BadgeStyle = {}) {
  const {
    label = "Profile views",
    style = "flat",
    color = "blue",
    labelColor = "gray",
    logo = "",
    logoWidth = 14,
    scale = 1,
  } = options;

  const labelText = label.trim();
  const countText = count.toLocaleString();

  const bgColor = namedColors[color] || color.replace(/^#/, "");
  const lblColor = namedColors[labelColor] || labelColor.replace(/^#/, "");

  const styles = {
    flat: {
      height: 20,
      radius: 3,
      fontSize: 11,
      paddingH: 8,
      gradient: false,
      shadow: false,
    },
    "flat-square": {
      height: 20,
      radius: 0,
      fontSize: 11,
      paddingH: 8,
      gradient: false,
      shadow: false,
    },
    plastic: {
      height: 20,
      radius: 4,
      fontSize: 11,
      paddingH: 8,
      gradient: true,
      shadow: true,
    },
    "for-the-badge": {
      height: 28,
      radius: 4,
      fontSize: 14,
      paddingH: 12,
      gradient: false,
      shadow: false,
      uppercase: true,
    },
    social: {
      height: 20,
      radius: 4,
      fontSize: 11,
      paddingH: 8,
      gradient: true,
      shadow: true,
      rounded: true,
    },
  }[style];

  const config = styles;
  const height = config.height * scale;
  const labelWidth =
    (labelText.length * config.fontSize * 0.6 + config.paddingH * 2) * scale;
  const countWidth =
    (countText.length * config.fontSize * 0.6 + config.paddingH * 2) * scale;
  const totalWidth =
    (labelWidth + countWidth + (logo ? logoWidth + 4 : 0)) * scale;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}">
  <title>${labelText}: ${countText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${
    config.radius
  }" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="#${lblColor}"/>
    <rect x="${labelWidth}" width="${countWidth}" height="${height}" fill="#${bgColor}"/>
    ${
      config.gradient
        ? `<rect width="${totalWidth}" height="${height}" fill="url(#s)"/>`
        : ""
    }
  </g>
  ${
    config.shadow
      ? `<g fill="#000" fill-opacity=".3">
    <rect x="1" width="${labelWidth}" height="1"/>
    <rect x="${labelWidth + 1}" width="${countWidth}" height="1"/>
  </g>`
      : ""
  }
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${
    config.fontSize * scale
  }">
    ${
      logo
        ? `<image x="5" y="${
            (height - logoWidth) / 2
          }" width="${logoWidth}" height="${logoWidth}" xlink:href="${logo}"/>`
        : ""
    }
    <text x="${labelWidth / 2 + (logo ? logoWidth : 0)}" y="${
    height / 2
  }" dominant-baseline="middle">
      ${config.uppercase ? labelText.toUpperCase() : labelText}
    </text>
    <text x="${labelWidth + countWidth / 2}" y="${
    height / 2
  }" dominant-baseline="middle">
      ${config.uppercase ? countText.toUpperCase() : countText}
    </text>
  </g>
</svg>`;
}

interface GitHubUser {
  login: string;
  followers: number;
  following: number;
}

async function getGitHubUser(username: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "GitHub-Profile-Views-Counter",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("GitHub API error:", error);
    return null;
  }
}

function isGitHubRequest(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  const via = request.headers.get("via") || "";

  return userAgent.startsWith("github-camo") && via.includes("github-camo");
}

app.get("/visitor-badge/:repo", async (c) => {
  try {
    const rateLimitResponse = await rateLimit(c, async () => {
      const repo = c.req.param("repo");
      const username = repo.split("/")[0];
      const isGitHub = isGitHubRequest(c.req.raw);

      const cachedCount = await c.env.RATELIMIT_KV.get(`views:${repo}`);
      let count = cachedCount ? parseInt(cachedCount) : 0;

      if (isGitHub) {
        c.executionCtx.waitUntil(
          (async () => {
            const [userResult, visitorResult] = await Promise.all([
              c.env.DB.prepare(
                `
              SELECT * FROM github_users 
              WHERE username = ?1 
              AND (julianday(CURRENT_TIMESTAMP) - julianday(last_updated)) * 24 < 24
            `
              )
                .bind(username)
                .first(),

              c.env.DB.prepare(
                `
              INSERT INTO visitors (repo, count, last_updated) 
              VALUES (?1, 1, CURRENT_TIMESTAMP)
              ON CONFLICT(repo) DO UPDATE SET 
              count = count + 1,
              last_updated = CURRENT_TIMESTAMP
              RETURNING count
            `
              )
                .bind(repo)
                .first(),
            ]);

            if (!userResult) {
              const githubUser = await getGitHubUser(username);
              if (githubUser) {
                await c.env.DB.prepare(
                  `
                INSERT INTO github_users (username, followers, following, last_updated)
                VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
                ON CONFLICT(username) DO UPDATE SET
                followers = ?2,
                following = ?3,
                last_updated = CURRENT_TIMESTAMP
              `
                )
                  .bind(username, githubUser.followers, githubUser.following)
                  .run();
              }
            }

            const newCount = visitorResult?.count || 1;
            await c.env.RATELIMIT_KV.put(`views:${repo}`, newCount.toString(), {
              expirationTtl: 60,
            });
          })()
        );
      }

      if (!cachedCount && isGitHub) {
        const result = await c.env.DB.prepare(
          `SELECT count FROM visitors WHERE repo = ?1`
        )
          .bind(repo)
          .first();
        count = (result?.count as number) || 1;

        await c.env.RATELIMIT_KV.put(`views:${repo}`, count.toString(), {
          expirationTtl: 60,
        });
      }

      const style = (c.req.query("style") as BadgeStyle["style"]) || "flat";
      const color = c.req.query("color") || "blue";
      const labelColor = c.req.query("label_color") || "gray";
      const label = c.req.query("label") || "Profile views";
      const logo = c.req.query("logo") || "";
      const scale = Number(c.req.query("scale")) || 1;

      const svg = getBadgeSVG(count, {
        style,
        color,
        labelColor,
        label,
        logo,
        scale,
        logoWidth: logo ? 14 : 0,
      });

      return new Response(svg, {
        headers: {
          ...commonHeaders,
          ETag: `"${count}"`,
        },
      });
    });

    return rateLimitResponse;
  } catch (error) {
    console.error("Visitor badge error:", error);
    return new Response(getErrorBadgeSVG("Server Error"), {
      status: 500,
      headers: commonHeaders,
    });
  }
});

function sanitizeText(text: string): string {
  return text
    .replace(/[<>&'"]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 50);
}

function getAIBadgeSVG(text: string, options: BadgeStyle = {}) {
  const {
    label = "AI Says",
    style = "flat",
    color = "blue",
    labelColor = "gray",
    scale = 1.5,
  } = options;

  const height = 28 * scale;
  const fontSize = 12 * scale;
  const padding = 10 * scale;

  const labelText = label.trim();
  const messageText = text.trim();

  const labelWidth = Math.max(
    labelText.length * fontSize * 0.6 + padding * 2,
    80
  );
  const messageWidth = Math.max(
    messageText.length * fontSize * 0.6 + padding * 2,
    200
  );
  const totalWidth = labelWidth + messageWidth;

  const bgColor = namedColors[color] || color.replace(/^#/, "");
  const lblColor = namedColors[labelColor] || labelColor.replace(/^#/, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <title>${labelText}: ${messageText}</title>
  <g>
    <rect width="${totalWidth}" height="${height}" fill="#${lblColor}" rx="4"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="${height}" fill="#${bgColor}" rx="4"/>
  </g>
  <g fill="#fff" text-anchor="start" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}">
    <text x="${padding}" y="${height / 2}" dominant-baseline="middle">
      ${labelText}
    </text>
    <text x="${labelWidth + padding}" y="${
    height / 2
  }" dominant-baseline="middle">
      ${messageText}
    </text>
  </g>
</svg>`;
}

app.get("/ai-badge", async (c) => {
  const ip = c.req.raw.headers.get("cf-connecting-ip") || "unknown";
  const prompt =
    c.req.query("prompt") || "Generate a short inspirational message";
  const cacheKey = `ai:${prompt}`;
  const rateLimitKey = `ai:ratelimit:${ip}`;

  try {
    const rateLimitData = await c.env.RATELIMIT_KV.get(rateLimitKey);
    if (rateLimitData) {
      const { count, timestamp } = JSON.parse(rateLimitData);
      const now = Date.now();
      if (now - timestamp < 60000) {
        if (count >= 5) {
          return new Response(getErrorBadgeSVG("Rate Limited"), {
            status: 429,
            headers: {
              ...commonHeaders,
              "Retry-After": "60",
            },
          });
        }
      }
    }

    const cachedResponse = await c.env.RATELIMIT_KV.get(cacheKey);
    if (cachedResponse) {
      c.executionCtx.waitUntil(
        updateRateLimit(c.env.RATELIMIT_KV, rateLimitKey)
      );

      const svg = getAIBadgeSVG(cachedResponse, {
        style: (c.req.query("style") as BadgeStyle["style"]) || "flat",
        color: c.req.query("color") || "blue",
        labelColor: c.req.query("label_color") || "gray",
        label: c.req.query("label") || "AI Says",
        scale: Number(c.req.query("scale")) || 1.5,
      });

      return new Response(svg, { headers: commonHeaders });
    }

    const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are a chatbot. Keep responses under 50 characters.",
        },
        { role: "user", content: prompt },
      ],
      stream: false,
      max_tokens: 50,
    });

    let aiText = "Hello World!";
    if (response && typeof response === "object" && "response" in response) {
      aiText = (response as any).response;
    } else if (response) {
      aiText = String(response);
    }

    c.executionCtx.waitUntil(
      Promise.all([
        c.env.RATELIMIT_KV.put(cacheKey, aiText, { expirationTtl: 900 }),
        updateRateLimit(c.env.RATELIMIT_KV, rateLimitKey),
      ])
    );

    const svg = getAIBadgeSVG(aiText, {
      style: (c.req.query("style") as BadgeStyle["style"]) || "flat",
      color: c.req.query("color") || "blue",
      labelColor: c.req.query("label_color") || "gray",
      label: c.req.query("label") || "AI Says",
      scale: Number(c.req.query("scale")) || 1.5,
    });

    return new Response(svg, { headers: commonHeaders });
  } catch (error) {
    console.error("AI badge error:", error);
    return new Response(getErrorBadgeSVG("AI Error"), {
      headers: commonHeaders,
    });
  }
});

async function updateRateLimit(kv: KVNamespace, key: string) {
  const current = await kv.get(key);
  const now = Date.now();
  let data;

  if (current) {
    data = JSON.parse(current);
    if (now - data.timestamp >= 60000) {
      data = { count: 1, timestamp: now };
    } else {
      data.count += 1;
    }
  } else {
    data = { count: 1, timestamp: now };
  }

  await kv.put(key, JSON.stringify(data), { expirationTtl: 60 });
}

export default app;
