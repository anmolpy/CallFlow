import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { ApiClientError, customersApi } from '../api';
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
import type { Customer, PageResponse } from '../types/api';
import { formatDateTime } from '../utils/format';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'lastName,asc', label: 'Last name (A–Z)' },
  { value: 'firstName,asc', label: 'First name (A–Z)' },
];

export function CustomersPage() {
  const [directory, setDirectory] = useState<PageResponse<Customer> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [sort, setSort] = useState('createdAt,desc');
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await customersApi.list({
        query: appliedQuery || undefined,
        page,
        size: PAGE_SIZE,
        sort,
      });
      setDirectory(result);
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load customers.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedQuery, page, sort]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (nextQuery === appliedQuery && page === 0) {
      void fetchCustomers();
      return;
    }
    setPage(0);
    setAppliedQuery(nextQuery);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (appliedQuery === '' && page === 0) {
      void fetchCustomers();
      return;
    }
    setPage(0);
    setAppliedQuery('');
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleSaved = (saved: Customer, mode: 'create' | 'edit') => {
    setModalOpen(false);
    setEditingCustomer(null);
    setStatusMessage(
      mode === 'create'
        ? `Added ${saved.firstName} ${saved.lastName} to customers.`
        : `Updated contact details for ${saved.firstName} ${saved.lastName}.`,
    );

    if (mode === 'create' && page !== 0) {
      setPage(0);
    } else {
      void fetchCustomers();
    }
  };

  const customers = directory?.content ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Search customer contacts, update records, and open call histories."
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            <span>Add customer</span>
          </Button>
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <ErrorBanner
          title="Unable to load customers"
          message={error}
          action={
            <Button variant="secondary" onClick={() => void fetchCustomers()}>
              Retry
            </Button>
          }
        />
      )}

      <Card
        title="Customer Directory"
        subtitle={
          directory
            ? `${directory.totalElements.toLocaleString()} total customer${
                directory.totalElements === 1 ? '' : 's'
              }`
            : 'Filter by customer name, email, or phone number'
        }
        action={
          appliedQuery ? (
            <Badge tone="info">Filter: &ldquo;{appliedQuery}&rdquo;</Badge>
          ) : undefined
        }
      >
        <div className="space-y-5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="customer-search"
                  type="search"
                  aria-label="Search customers"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" variant="secondary">
                  Search
                </Button>
                {(searchInput || appliedQuery) && (
                  <Button variant="ghost" onClick={handleClearSearch}>
                    Clear search
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="customer-sort" className="shrink-0 text-sm font-medium text-slate-600">
                Sort
              </label>
              <select
                id="customer-sort"
                aria-label="Sort customers"
                value={sort}
                onChange={(e) => {
                  setPage(0);
                  setSort(e.target.value);
                }}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {isLoading && !directory ? (
            <LoadingSpinner label="Loading customer directory..." />
          ) : customers.length === 0 ? (
            appliedQuery ? (
              <EmptyState
                title="No matching customers"
                description={`No customer records match "${appliedQuery}".`}
                action={
                  <Button variant="secondary" onClick={handleClearSearch}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No customers yet"
                description="Add your first customer record to track calls and support history."
                action={
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    <span>Add customer</span>
                  </Button>
                }
              />
            )
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 pr-4">Customer</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Added</th>
                      <th className="py-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="transition-colors hover:bg-slate-50">
                        <td className="py-3.5 pr-4">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                          >
                            {customer.firstName} {customer.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{customer.email}</td>
                        <td className="px-4 py-3.5 text-slate-600">{customer.phoneNumber}</td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {formatDateTime(customer.createdAt)}
                        </td>
                        <td className="py-2.5 pl-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => openEditModal(customer)}
                              aria-label={`Edit ${customer.firstName} ${customer.lastName}`}
                            >
                              <Pencil className="h-4 w-4" />
                              <span>Edit</span>
                            </Button>
                            <Link
                              to={`/customers/${customer.id}`}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              <span>View profile</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-base font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                        >
                          {customer.firstName} {customer.lastName}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Added {formatDateTime(customer.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                      <p className="flex items-center gap-2 break-all">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{customer.email}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{customer.phoneNumber}</span>
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => openEditModal(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                      <Link
                        to={`/customers/${customer.id}`}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        <span>View profile</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {directory && (
                <PaginationBar
                  page={directory.page}
                  size={directory.size}
                  totalElements={directory.totalElements}
                  totalPages={directory.totalPages}
                  first={directory.first}
                  last={directory.last}
                  itemLabel="customers"
                  onPageChange={(nextPage) => setPage(nextPage)}
                />
              )}
            </>
          )}
        </div>
      </Card>

      <CustomerFormModal
        open={modalOpen}
        customer={editingCustomer}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
