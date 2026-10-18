# Medios de la presentación

Fotos y clips que usan los feeds de EGC vs. UGC ([`../datos/feeds.json`](../datos/feeds.json), campo `archivo`, por ejemplo `"../media/egc-dia1.mp4"`).

- **Clips:** MP4 (H.264), 720p o menos, vertical 9:16, 5 a 10 s, sin audio; menos de 2 MB cada uno. Se reproducen en silencio y en bucle solo mientras se ven.
- **Fotos:** JPG o WebP de 1600 px como máximo, verticales.
- Todo va dentro del repositorio: nada se carga en vivo desde Instagram o TikTok.
- Cada publicación muestra su cuenta de origen (uso académico).

Para comprimir un clip con ffmpeg:

```
ffmpeg -i original.mp4 -t 8 -an -vf "scale=-2:1280,crop=720:1280" -c:v libx264 -crf 28 -preset slow -movflags +faststart egc-dia1.mp4
```
