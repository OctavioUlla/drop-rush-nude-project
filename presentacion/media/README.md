# Medios de la presentación

Fotos y clips que usan los feeds de EGC vs. UGC y la pared viral ([`../datos/feeds.json`](../datos/feeds.json), campo `archivo`, por ejemplo `"../media/egc-dia1.mp4"`).

- **Clips:** MP4 (H.264), 720p o menos, vertical 9:16, 5 a 10 s, sin audio; menos de 2 MB cada uno. Se reproducen en silencio y en bucle solo mientras se ven.
- **Fotos:** JPG o WebP de 1600 px como máximo, verticales.
- Todo va dentro del repositorio: nada se carga en vivo desde Instagram o TikTok.
- Cada publicación muestra su cuenta de origen (uso académico).

Para comprimir un clip con ffmpeg:

```
ffmpeg -i original.mp4 -t 8 -an -vf "scale=-2:1280,crop=720:1280" -c:v libx264 -crf 28 -preset slow -movflags +faststart egc-dia1.mp4
```

## Clips actuales

Recortados de TikTok (8 s aprox., sin audio). Las vistas se tomaron el 18/10/2026.

| Feed | Archivo | Cuenta | Tramo del original | Publicación |
|---|---|---|---|---|
| EGC | `egc-dia5-gary-vee.mp4` | @nudeproject | 4,5 a 12,5 s | [TikTok](https://www.tiktok.com/@nudeproject/video/7563203803151895830) |
| EGC | `egc-origen.mp4` | @nudeproject | 0 a 9 s | [TikTok](https://www.tiktok.com/@nudeproject/video/6964446640346303750) |
| EGC | `egc-podcast-colapinto.mp4` | @nudeprojectpodcast | 0 a 8 s | [TikTok](https://www.tiktok.com/@nudeprojectpodcast/video/7491275434005433623) |
| EGC | `egc-apertura-barcelona.mp4` | @nudeproject | 4,5 a 12,1 s | [TikTok](https://www.tiktok.com/@nudeproject/video/7632700411228491030) |
| UGC | `ugc-llegada-miami.mp4` | @andrewponch | 6 a 14 s | [TikTok](https://www.tiktok.com/@andrewponch/video/7559736425516633362) |
| UGC | `ugc-apertura-miami.mp4` | @christianrodr_ | 15,5 a 23,5 s | [TikTok](https://www.tiktok.com/@christianrodr_/video/7560100068821437727) |
| UGC | `ugc-outfit-tank.mp4` | @nataliesmirnakos | 2 a 10 s | [TikTok](https://www.tiktok.com/@nataliesmirnakos/video/7647728671951817991) |
| UGC | `ugc-outfit-pullover.mp4` | @santiabarzaa | 10,5 a 18,5 s | [TikTok](https://www.tiktok.com/@santiabarzaa/video/7497715567646870790) |
| Viral | `viral-out-of-office.mp4` | @nudeproject | 1,2 a 6,2 s, recortado sobre la remera para que se lea la frase | [TikTok](https://www.tiktok.com/@nudeproject/video/7540362569878424854) |
