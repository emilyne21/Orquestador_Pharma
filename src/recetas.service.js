import { http } from "./http.js";
const client = http(process.env.RECETAS_BASE_URL, {
  timeout: Number(process.env.HTTP_TIMEOUT || 4000),
  retries: Number(process.env.HTTP_RETRIES || 2)
});

export async function obtenerReceta(id) {
  const res = await client.get(`/recetas/${id}`);
  return res.data; // {id_receta,id_sucursal,fecha,estado,detalles:[{id_producto,cantidad}]}
}
