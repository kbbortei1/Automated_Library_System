# Branding assets

Files in `public/` are served from the site root (`/knust-logo.png`) and copied verbatim
into `dist/` on build, no import needed.

| File | Used by | Source | Licence |
| --- | --- | --- | --- |
| `public/knust-logo.png` | `components/KnustCrest.tsx` | Official KNUST emblem, [knust.edu.gh](https://www.knust.edu.gh/about/knust/emblem) (`KNUST_logo-Vector_0.jpg`) | University trademark, used here for KNUST's own library system |
| `public/prempeh-library.jpg` | `components/AuthLayout.tsx` | ["Prempeh II library.jpg"](https://commons.wikimedia.org/wiki/File:Prempeh_II_library.jpg) by Sarah Bawa, Wikimedia Commons | **CC0** (public domain dedication), no attribution required |

## How they were processed

Both were prepared with Pillow from the originals:

**Crest**: the source is a JPEG on a white background. The white surround was removed by
flood-filling inward from all four corners (rather than keying out white globally, which would
have punched holes in the pot and the motto banner, both of which are legitimately white).
Then trimmed to the emblem's bounding box, padded to a square with ~6% margin, and resampled
to 512×512 PNG. Square and transparent, so `KnustCrest` can size it on one dimension.

**Photograph**: bottom 7% of empty lawn cropped off, upscaled to 1600px wide with LANCZOS so
browsers downsample rather than upsample on the tall auth panel, unsharp-masked to restore edge
definition, then +12% contrast and +15% saturation so it holds up under the dark green scrim.
Saved as progressive JPEG at q82 (287 KB).

## Replacing them

Drop in a file of the same name, no code change needed. Both components fall back gracefully
if a file is missing (`KnustCrest` renders an original pot-of-fire + book SVG; `AuthLayout`
renders a forest-green gradient), so a bad path degrades instead of breaking.

The photo panel applies a two-part scrim (a flat tint plus a vertical falloff that darkens
the top and bottom), so a replacement shot with different exposure should still keep the
overlaid text legible. The copy also carries a soft text-shadow as a second line of defence.
