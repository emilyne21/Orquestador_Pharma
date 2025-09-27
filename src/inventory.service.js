import { http } from "./http.js";
import qs from "qs";

const client = http(process.env.INVENTARIO_BASE_URL, {
  timeout: Number(process.env.HTTP_TIMEOUT || 4000),
  retries: Number(process.env.HTTP_RETRIES || 2)
});

export async function listarSucursales() {
  const res = await client.get(`/api/sucursales`, { params: { size: 9999 } });
  return res.data.items || res.data;
}

export async function consultarStock({ idsProducto = [], distrito }) {
  const params = {};
  if (idsProducto?.length) params.id_producto = idsProducto; // array → querystring repetido
  if (distrito) params.distrito = distrito;
  const res = await client.get(`/api/stock`, {
    params,
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat: "repeat" })
  });
  return res.data; // [{id_sucursal,distrito,id_producto,stock_disponible,pto_reorden}, ...]
}
