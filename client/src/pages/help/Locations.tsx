import { Card, Skeleton } from '../../components/ui';
import { PinIcon } from '../../components/icons';
import { policyText, useLibraryPolicy } from '../../lib/policy';
import { HelpLayout, NotPublished } from './HelpLayout';

interface Branch {
  name: string;
  where?: string;
  hours?: string;
}

/**
 * Locations are held as one setting, one library per line, fields separated by
 * a pipe: "Name | Where to find it | Hours". A plain text box is the only
 * editor an administrator needs, and lines with fewer fields still work.
 */
function parseLocations(raw: string | null): Branch[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, where, hours] = line.split('|').map((p) => p.trim());
      return { name, where: where || undefined, hours: hours || undefined };
    })
    .filter((b) => b.name);
}

export default function Locations() {
  const { data: policy, isLoading } = useLibraryPolicy();
  const branches = parseLocations(policyText(policy, 'library_locations'));

  return (
    <HelpLayout
      title="Library Locations"
      subtitle="Where to find the libraries covered by this catalogue."
      current="/help/locations"
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : branches.length === 0 ? (
        <Card>
          <NotPublished what="its list of locations" />
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            This catalogue covers the Prempeh II Library and the college libraries of Kwame Nkrumah
            University of Science and Technology. Every copy in the catalogue carries a shelf mark,
            which staff at any desk can use to tell you exactly where it is held.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((b) => (
              <Card key={b.name}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <PinIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-fg">{b.name}</h2>
                    {b.where && <p className="mt-1 text-sm text-fg-muted">{b.where}</p>}
                    {b.hours && (
                      <p className="mt-2 text-xs uppercase tracking-wide text-fg-subtle">
                        {b.hours}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <p className="text-sm leading-relaxed text-fg-muted">
              Every copy in the catalogue carries a shelf mark. Open a title and the shelf mark is
              listed against each copy, so staff at any desk can tell you exactly where it is held.
            </p>
          </Card>
        </>
      )}
    </HelpLayout>
  );
}
