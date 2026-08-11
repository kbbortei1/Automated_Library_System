import { useState, type ReactNode } from 'react';
import { KnustCrest } from './KnustCrest';

const MOTTO = 'Nyansapɔ Wɔsane No Badwenma';
const MOTTO_EN = 'The knot of wisdom is untied only by the wise';

/**
 * Photographic backdrop of the Prempeh II Library.
 *
 * The deep-green gradient underneath is always painted, so if
 * `public/prempeh-library.jpg` is missing the panel still reads as a
 * deliberate institutional block rather than an empty box.
 */
function LibraryBackdrop() {
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-knust-900 via-knust-800 to-knust-600">
      {!failed && (
        <img
          src="/prempeh-library.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
      {/* Scrim: keeps the overlaid text legible whatever the photo's exposure. */}
      <div className="absolute inset-0 bg-gradient-to-t from-knust-900 via-knust-900/80 to-knust-900/45" />
      {/* Gold hairline echoing the crest. */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold-500/60 to-transparent" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-gold-400">{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---- Brand panel (desktop only) ---- */}
      <aside className="relative hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <LibraryBackdrop />

        <div className="relative flex items-center gap-4">
          <KnustCrest className="h-16 w-16" />
          <div>
            <div className="font-display text-xl font-bold leading-tight text-white">KNUST</div>
            <div className="text-xs uppercase tracking-[0.18em] text-gold-400">University Library</div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2 className="font-display text-4xl font-bold leading-tight text-white xl:text-5xl">
            Prempeh&nbsp;II Library
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            The management centre of the KNUST Library System — serving the Prempeh&nbsp;II Library,
            six college libraries and the distance-learning collections from one catalogue.
          </p>

          <blockquote className="mt-8 border-l-2 border-gold-500 pl-4">
            <p className="font-display text-lg italic text-gold-300">{MOTTO}</p>
            <footer className="mt-1 text-sm text-white/60">{MOTTO_EN}</footer>
          </blockquote>
        </div>

        <div className="relative flex gap-10 border-t border-white/15 pt-6">
          <Stat value="1952" label="Est." />
          <Stat value="7" label="Libraries" />
          <Stat value="24/7" label="Online access" />
        </div>
      </aside>

      {/* ---- Form panel ---- */}
      <main className="flex flex-col bg-white">
        {/* Compact brand band standing in for the photo panel on small screens. */}
        <div className="relative flex items-center gap-3 bg-knust-900 px-5 py-4 lg:hidden">
          <KnustCrest className="h-10 w-10" />
          <div>
            <div className="font-display text-base font-bold leading-tight text-white">KNUST</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold-400">
              Prempeh II Library
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-gold-500 via-lust to-knust-500" />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
          <div className="w-full max-w-md">
            <header className="mb-8">
              <h1 className="font-display text-3xl font-bold text-knust-900">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
            </header>

            {/*
              Arbitrary-variant overrides re-tint the shared <Input>/<Select> focus
              ring from navy to KNUST green for the auth screens only — higher
              specificity than the components' own focus classes.
            */}
            <div className="[&_input:focus]:border-knust-500 [&_input:focus]:ring-knust-500/20 [&_select:focus]:border-knust-500 [&_select:focus]:ring-knust-500/20">
              {children}
            </div>

            <p className="mt-10 text-center text-xs leading-relaxed text-slate-400">
              Kwame Nkrumah University of Science and Technology
              <br />
              Kumasi, Ghana
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
