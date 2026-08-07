# Juego de Arkanoid

Clon de Arkanoid/Breakout hecho con HTML, CSS y JavaScript puro — **cero dependencias** (sin framework, sin build tool, sin package manager).

## Cómo jugar

Abrir `index.html` directamente en el navegador (o servir el directorio con cualquier servidor estático).

**Controles:**
- Flechas izquierda/derecha: mover la paleta.
- SPACE: iniciar partida / relanzar la bola / avanzar de nivel / reiniciar partida.
- P o ESC: pausar/reanudar.
- R: reiniciar partida (en Game Over o Win).
- M: silenciar/activar el sonido.

## Características

- 3 niveles con grid de bloques (7x14) y velocidad de bola creciente (+15% por nivel).
- Animación de explosión de bloques al destruirlos.
- Sistema de vidas (3) y puntaje.
- Pantallas de inicio, pausa, nivel completado, game over y victoria.
- Efectos de sonido (rebote y rotura de bloques) con opción de silenciar.

## Estado del proyecto

Implementado y jugable de principio a fin. El desarrollo sigue un flujo spec-driven: cada feature está documentada en `specs/NN-slug.md` (objetivo, alcance, decisiones tomadas y criterios de aceptación) antes de implementarse. Ver `CLAUDE.md` para el detalle de arquitectura y estado actual.
