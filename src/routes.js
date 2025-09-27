import express from "express";
import { buscarProductos } from "./catalog.service.js";
import { consultarStock, listarSucursales } from "./inventory.service.js";
import { obtenerReceta } from "./recetas.service.js";

const router = express.Router();

router.get("/health", (_, res) => res.json({ status: "ok", service: "orchestrator" }));

/**
 * GET /disponibilidad?producto=texto|id&id_producto=P123&id_producto=P456&distrito=...
 * - si llega id_producto → usa esos IDs
 * - si llega producto (texto) → busca en Catálogo y usa sus IDs
 * - responde producto(s) + stock por sucursal
 */
router.get("/disponibilidad", async (req, res, next) => {
  try {
    const { producto, distrito } = req.query;
    let ids = Array.isArray(req.query.id_producto) ? req.query.id_producto :
              req.query.id_producto ? [req.query.id_producto] : [];

    let productos = [];
    if (!ids.length) {
      productos = await buscarProductos({ query: producto });
      ids = (productos || []).map(p => p.id || p._id || p.id_producto).filter(Boolean);
    } else {
      productos = await buscarProductos({ ids });
    }
    if (!ids.length) return res.status(404).json({ message: "Producto no encontrado" });

    const stock = await consultarStock({ idsProducto: ids, distrito });
    // Agrupar por producto
    const porProducto = {};
    for (const p of productos) {
      const pid = p.id || p._id || p.id_producto;
      porProducto[pid] = { producto: { id: pid, nombre: p.nombre, atc: p.atc, rx: p.rx, termocadena: p.termocadena }, disponibilidad: [] };
    }
    for (const s of stock) {
      const pid = s.id_producto;
      if (porProducto[pid]) {
        porProducto[pid].disponibilidad.push({
          id_sucursal: s.id_sucursal,
          distrito: s.distrito,
          stock: s.stock_disponible,
          pto_reorden: s.pto_reorden
        });
      }
    }
    res.json(Object.values(porProducto));
  } catch (e) { next(e); }
});

/**
 * GET /receta/:id/validacion
 * - Trae receta (MS2), mapea sucursal → distrito (MS1), consulta stock (MS1)
 * - Devuelve: cumple, faltantes[], alternativas[]
 */
router.get("/receta/:id/validacion", async (req, res, next) => {
  try {
    const receta = await obtenerReceta(req.params.id);
    if (!receta?.detalles?.length) return res.status(404).json({ message: "Receta no encontrada o sin detalles" });

    const sucursales = await listarSucursales();
    const mapaSuc = new Map(sucursales.map(s => [String(s.id_sucursal), s]));
    const suc = mapaSuc.get(String(receta.id_sucursal));
    const distrito = suc?.distrito;

    const ids = receta.detalles.map(d => d.id_producto);
    const stockZona = await consultarStock({ idsProducto: ids, distrito });   // alternativas por misma zona
    const stockSuc = stockZona.filter(s => String(s.id_sucursal) === String(receta.id_sucursal));

    const faltantes = [];
    for (const item of receta.detalles) {
      const enSuc = stockSuc.find(s => s.id_producto === item.id_producto);
      const disponible = enSuc ? enSuc.stock_disponible : 0;
      if (disponible < item.cantidad) {
        faltantes.push({
          id_producto: item.id_producto,
          requerido: item.cantidad,
          disponible
        });
      }
    }
    const cumple = faltantes.length === 0;

    // alternativas: sucursales de la misma zona con stock suficiente
    const alternativas = [];
    if (!cumple) {
      for (const item of receta.detalles) {
        const candidatos = stockZona
          .filter(s => s.id_producto === item.id_producto && s.id_sucursal !== receta.id_sucursal && s.stock_disponible >= item.cantidad)
          .map(s => ({ id_sucursal: s.id_sucursal, distrito: s.distrito, id_producto: item.id_producto, stock: s.stock_disponible }));
        if (candidatos.length) alternativas.push({ id_producto: item.id_producto, opciones: candidatos });
      }
    }

    res.json({
      receta: { id_receta: receta.id_receta, id_sucursal: receta.id_sucursal, distrito },
      cumple,
      faltantes,
      alternativas
    });
  } catch (e) { next(e); }
});

export default router;
