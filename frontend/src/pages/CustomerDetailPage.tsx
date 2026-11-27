import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Mail,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  X,
} from 'lucide-react';
import { ApiClientError, customersApi } from '../api';
import { CreateCallModal } from '../components/calls/CreateCallModal';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  PaginationBar,
} from '../components/ui';
import type { CallDetail, CallSummary, Customer, PageResponse } from '../types/api';
import { CALL_STATUS_META, formatDateTime, formatDuration } from '../utils/format';

const PAGE_SIZE = 10;

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);
  const validId = Number.isInteger(customerId) && customerId > 0;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [callsPage, setCallsPage] = useState<PageResponse<CallSummary> | null>(null);
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createCallOpen, setCreateCallOpen] = useState(false);

  const loadCustomerAndCalls = useCallback(async () => {
    if (!validId) {
      setIsLoading(false);
      setError('Invalid customer ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [customerData, historyPage] = await Promise.all([
        customersApi.getById(customerId),
        customersApi.getCalls(customerId, page, PAGE_SIZE),
      ]);
      setCustomer(customerData);
      setCallsPage(historyPage);
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load customer details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId, page, validId]);

  useEffect(() => {
    void loadCustomerAndCalls();
  }, [loadCustomerAndCalls]);

  const handleCustomerUpdated = (updated: Customer) => {
    setCustomer(updated);
    setEditModalOpen(false);
    setStatusMessage(`Updated contact details for ${updated.firstName} ${updated.lastName}.`);
  };

  const handleCallCreated = (created: CallDetail) => {
    setCreateCallOpen(false);
    navigate(`/calls/${created.id}`);
  };

  if (isLoading && !customer) {
    return <LoadingSpinner label="Loading customer profile..." />;
  }

  const calls = callsPage?.content ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/customers"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to customers</span>
        </Link>
      </div>

      {error && !customer ? (
        <ErrorBanner
          title="Unable to load customer"
          message={error}
          action={
            validId ? (
              <Button variant="secondary" onClick={() => void loadCustomerAndCalls()}>
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : (
        customer && (
          <>
            <PageHeader
              title={`${customer.firstName} ${customer.lastName}`}
              description={`Customer #${customer.id} contact record and chronological call history.`}
              actions={
                <>
                  <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                    <Pencil className="h-4 w-4" />
                    <span>Edit customer</span>
                  </Button>
                  <Button onClick={() => setCreateCallOpen(true)}>
                    <Plus className="h-4 w-4" />
                    <span>Log call</span>
                  </Button>
                </>
              }
            />

            {statusMessage && (
              <div
                role="status"
                className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{statusMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  aria-label="Dismiss notification"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {error && (
              <ErrorBanner
                title="Refresh failed"
                message={error}
                action={
                  <Button variant="secondary" onClick={() => void loadCustomerAndCalls()}>
                    Retry
                  </Button>
                }
              />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Contact Information" className="lg:col-span-1">
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </dt>
                    <dd className="mt-1 break-all font-medium text-slate-900">{customer.email}</dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Phone className="h-3.5 w-3.5" />
                      <span>Phone number</span>
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">{customer.phoneNumber}</dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Created</span>
                    </dt>
                    <dd className="mt-1 text-slate-700">{formatDateTime(customer.createdAt)}</dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Last updated
                    </dt>
                    <dd className="mt-1 text-slate-700">{formatDateTime(customer.updatedAt)}</dd>
                  </div>
                </dl>
              </Card>

              <Card
                title="Call History"
                subtitle={
                  callsPage
                    ? `${callsPage.totalElements.toLocaleString()} call${
                        callsPage.totalElements === 1 ? '' : 's'
                      } recorded`
                    : 'Customer support interactions'
                }
                action={<PhoneCall className="h-5 w-5 text-brand-600" />}
                className="lg:col-span-2"
              >
                {calls.length === 0 ? (
                  <EmptyState
                    title="No calls logged for this customer"
                    description="Log a support call to begin tracking assignment, duration, and resolution notes."
                    action={
                      <Button onClick={() => setCreateCallOpen(true)}>
                        <Plus className="h-4 w-4" />
                        <span>Log call</span>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead>
                          <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <th className="py-3 pr-4">Call</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Agent</th>
                            <th className="px-4 py-3 text-right">Duration</th>
                            <th className="px-4 py-3">Logged</th>
                            <th className="py-3 pl-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {calls.map((call) => {
                            const statusMeta = CALL_STATUS_META[call.status];
                            return (
                              <tr key={call.id} className="transition-colors hover:bg-slate-50">
                                <td className="py-3 pr-4 font-semibold text-slate-900">
                                  #{call.id}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {call.agentName ?? 'Unassigned'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-700">
                                  {formatDuration(call.durationSeconds)}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatDateTime(call.createdAt)}
                                </td>
                                <td className="py-2 pl-4 text-right">
                                  <Link
                                    to={`/calls/${call.id}`}
                                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700"
                                  >
                                    <span>Open call</span>
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                      {calls.map((call) => {
                        const statusMeta = CALL_STATUS_META[call.status];
                        return (
                          <div
                            key={call.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">Call #{call.id}</span>
                              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              Agent: {call.agentName ?? 'Unassigned'} • Duration:{' '}
                              {formatDuration(call.durationSeconds)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(call.createdAt)}
                            </p>
                            <div className="mt-3">
                              <Link
                                to={`/calls/${call.id}`}
                                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                              >
                                <span>Open call</span>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {callsPage && (
                      <PaginationBar
                        page={callsPage.page}
                        size={callsPage.size}
                        totalElements={callsPage.totalElements}
                        totalPages={callsPage.totalPages}
                        first={callsPage.first}
                        last={callsPage.last}
                        itemLabel="calls"
                        onPageChange={(nextPage) => setPage(nextPage)}
                      />
                    )}
                  </div>
                )}
              </Card>
            </div>

            <CustomerFormModal
              open={editModalOpen}
              customer={customer}
              onClose={() => setEditModalOpen(false)}
              onSaved={handleCustomerUpdated}
            />

            <CreateCallModal
              open={createCallOpen}
              presetCustomer={customer}
              onClose={() => setCreateCallOpen(false)}
              onCreated={handleCallCreated}
            />
          </>
        )
      )}
    </div>
  );
}
