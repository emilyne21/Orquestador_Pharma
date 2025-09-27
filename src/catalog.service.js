import { http } from "./http.js";
const client = http(process.env.CATALOGO_BASE_URL, {
  timeout: Number(process.env.HTTP_TIMEOUT || 4000),
  retries: Number(process.env.HTTP_RETRIES || 2)
});

// Busca por texto y/o obtiene por id
export async function buscarProductos({ query, ids = [] }) {
  if (ids.length) {
    const results = await Promise.all(ids.map(id => client.get(`/productos/${id}`)));
    return results.map(r => r.data);
  }
  const res = await client.get(`/productos`, { params: { query, size: 20 } });
  return res.data?.items || res.data || []; // según tu implementación
}
