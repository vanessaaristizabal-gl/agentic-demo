/**
 * Capa de dominio. Punto único de entrada.
 *
 * Nada de lo que hay aquí depende de React, del navegador, de Dexie ni de la
 * red: son entidades, catálogos y reglas puras. Las capas de aplicación,
 * infraestructura y presentación dependen de esta, nunca al revés.
 */
export * from './types';
export * from './catalog';
export * from './stages';
export * from './agents';
export * from './entities';
export * from './requirements';
export * from './messages';
export * from './lifecycle';
export * from './orchestrator';
