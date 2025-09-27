import axios from "axios";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function http(baseURL, { timeout = 4000, retries = 1 } = {}) {
  const client = axios.create({ baseURL, timeout });
  client.interceptors.response.use(null, async (error) => {
    const cfg = error.config;
    if (!cfg || cfg.__retryCount >= retries) throw error;
    cfg.__retryCount = (cfg.__retryCount || 0) + 1;
    await sleep(200 * cfg.__retryCount);
    return client(cfg);
  });
  return client;
}
