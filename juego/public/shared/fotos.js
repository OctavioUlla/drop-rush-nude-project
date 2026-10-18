// Foto del grupo (selfie o fit check, issue #42): room:groups trae la versión de la foto de cada grupo (`photo`, 0 si
// no tiene) y la imagen se pide aparte. La ven los proyectores de la sala (con su clave) y el celular del grupo (con
// su token), así el código de la sala solo no alcanza para bajar las caras de la clase.

/** Lado del JPEG cuadrado que arma el celular (~20 KB): en el proyector se ve como mucho a este tamaño. */
export const LADO_FOTO = 256;

/** URL de la foto de un grupo, o null si no tiene. */
export function urlFoto(codigo, numero, version, clave) {
  if (!codigo || !version || !clave) return null;
  return `/api/fotos/${encodeURIComponent(codigo)}/${numero}?v=${version}&clave=${encodeURIComponent(clave)}`;
}
