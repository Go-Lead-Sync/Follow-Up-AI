import https from "https";
import http from "http";

const url = process.env.PING_URL;
if (!url) {
  console.error("PING_URL not set");
  process.exit(1);
}

const client = url.startsWith("https") ? https : http;

client
  .get(url, (res) => {
    console.log(`Pinged ${url} -> ${res.statusCode}`);
    res.resume();
  })
  .on("error", (err) => {
    console.error("Ping failed:", err.message);
    process.exit(1);
  });
