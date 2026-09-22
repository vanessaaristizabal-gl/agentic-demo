/**
 * Un mensaje traducible: la clave y los valores que la frase necesita.
 *
 * El dominio compone mensajes pero no los escribe. Así las reglas no dependen
 * del idioma y añadir uno nuevo no toca ni una línea de lógica.
 */
export interface Message {
  key: string;
  params?: Record<string, string | number>;
}
