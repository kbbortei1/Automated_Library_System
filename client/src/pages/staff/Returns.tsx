import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Input } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { money } from '../../lib/format';

interface ReturnResult {
  loan: { copy: { book: { title: string } } };
  fine: { amount: string; reason: string } | null;
  reservationPromoted: boolean;
}

export default function Returns() {
  const [accession, setAccession] = useState('');
  const [info, setInfo] = useState<ReturnResult | null>(null);
  const [error, setError] = useState('');

  const returnLoan = useMutation({
    mutationFn: async () => {
      const copy = (await api.get('/catalog/copies/lookup', { params: { accessionNumber: accession } }))
        .data as { id: string };
      return (await api.post('/circulation/return', { copyId: copy.id })).data as ReturnResult;
    },
    onSuccess: (data) => {
      setInfo(data);
      setError('');
      setAccession('');
    },
    onError: (e) => {
      setError(apiErrorMessage(e));
      setInfo(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Returns" subtitle="Process a returned copy." />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            returnLoan.mutate();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <Input
            label="Accession number"
            required
            value={accession}
            onChange={(e) => setAccession(e.target.value)}
          />
          <Button type="submit" disabled={returnLoan.isPending}>
            Return
          </Button>
        </form>
      </Card>

      {error && <Alert>{error}</Alert>}

      {info && (
        <Alert kind={info.fine ? 'error' : 'success'}>
          <div className="font-medium">Returned: {info.loan.copy.book.title}</div>
          {info.fine ? (
            <div>
              Overdue fine issued: {money(info.fine.amount)} ({info.fine.reason})
            </div>
          ) : (
            <div>No fine — returned on time.</div>
          )}
          {info.reservationPromoted && (
            <div>📌 Held for the next member in the reservation queue.</div>
          )}
        </Alert>
      )}
    </div>
  );
}
