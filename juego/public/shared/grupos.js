import { colores, colores3d, colorDeGrupo } from '../../../design-system/tokens.js';
import { esProfe } from './constantes.js';

// Color de la ficha y del buzo de cada grupo. Los profes van todos en cacao con texto crema:
// se distinguen de los 40 colores de los grupos y se leen como "fuera de concurso".
const PROFE = { color: colores.marca.cacao, texto: colores.marca.crema, color3d: colores3d.marca.cacao };

export const colorGrupo = (numero) => (esProfe(numero) ? PROFE : colorDeGrupo(numero));
