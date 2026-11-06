# Escena de palta de la Home

La sección `#esencia` usa dos mitades y una semilla como capas fotográficas independientes. El desplazamiento controla su apertura, inclinación, profundidad y sombras. La escena no reacciona al movimiento del cursor. No usa un motor WebGL ni nuevas dependencias.

## Recursos

Generados con la herramienta integrada de imágenes a partir de `palta3.jpg`, referencia aportada por el usuario. Las referencias originales se conservan intactas. Los PNG generados se convirtieron a WebP de 1000 × 1000, con calidad 85 y transparencia conservada.

- `public/imagenes/inicio/palta-mitad-principal.webp`
- `public/imagenes/inicio/palta-mitad-posterior.webp`
- `public/imagenes/inicio/palta-semilla.webp`

Next Image aplica carga diferida y tamaños adaptativos. La escena reserva su espacio antes de cargar. El movimiento actualiza transformaciones sin renderizados de React por fotograma y se suspende fuera de pantalla o con la pestaña oculta. La preferencia de movimiento reducido desactiva los controladores y muestra una composición estática, sin tramo de scroll adicional.

## Prompts utilizados

Cada recurso usó el siguiente prefijo común y su descripción específica. Se solicitó fondo transparente y se adjuntó `palta3.jpg` como referencia en los tres casos.

### Prefijo común

> Use case: background-extraction / product-mockup. Reference image: supplied palta3.jpg, the user's photographic avocado reference. Produce ONE isolated photorealistic 3D product asset for a premium nutrition SaaS website, not a whole scene. Preserve its natural dark Hass pebble skin, pale yellow-green flesh, rich green rim and soft warm studio lighting. Genuine transparent alpha background. No floor, no cast ground shadow, no colored backdrop, no text, no decorative elements, no other fruit. Complete silhouette fully in frame with a small 8% transparent margin. Square composition.

### Mitad principal

> Show one vertically cut avocado HALF, seed REMOVED so a smooth natural round pit cavity is clearly visible in the lower-middle of the cut surface. The avocado is upright with narrow neck on top, broad round base below, nearly front-facing at a slight 10-degree angle so the RIGHT outer skin edge has visible dimensional thickness. Keep flesh fresh yellow-green, not brown. Single half only. It should occupy roughly 80% canvas height and 60% canvas width. Soft key light upper left, refined warm highlights, highly realistic surface detail.

### Mitad posterior

> Show one vertically cut avocado HALF, seed REMOVED, with the hollow round pit cavity visible. Narrow neck at top, broad round base below. Turn this half 30 degrees toward the RIGHT so its LEFT outer pebbled dark skin side is thick and visible, while the fresh pale yellow-green cut surface still faces the viewer. Keep the same product scale and lighting as the reference. Single half only, roughly 80% canvas height and 55% canvas width.

### Semilla

> Isolate just ONE avocado PIT, a single naturally rounded oval brown avocado seed, based on the seed in the RIGHT half in the reference image. No flesh, no peel, no avocado half. Rich warm chestnut brown with fine natural marbling and subtly satin surface; spherical volume with a slightly tapered top, frontal view. Soft key light upper left, highlights on upper-left, natural dimensional darker edge at lower-right. Complete pit centered occupying 68% of square canvas. Truly transparent alpha backdrop.
