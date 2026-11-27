import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError, customersApi } from '../../api';
import type { Customer, CustomerRequest } from '../../types/api';
import { Button, ErrorBanner, Modal } from '../ui';

interface CustomerFormModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer, mode: 'create' | 'edit') => void;
}

interface CustomerFieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+0-9()\s-]{7,30}$/;

function validateCustomer(values: CustomerRequest): CustomerFieldErrors {
  const errors: CustomerFieldErrors = {};

  if (!values.firstName) {
    errors.firstName = 'First name is required';
  } else if (values.firstName.length > 100) {
    errors.firstName = 'First name must not exceed 100 characters';
  }

  if (!values.lastName) {
    errors.lastName = 'Last name is required';
  } else if (values.lastName.length > 100) {
    errors.lastName = 'Last name must not exceed 100 characters';
  }

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Email must be a valid email address';
  } else if (values.email.length > 255) {
    errors.email = 'Email must not exceed 255 characters';
  }

  if (!values.phoneNumber) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!PHONE_PATTERN.test(values.phoneNumber)) {
    errors.phoneNumber =
      'Phone number must be 7-30 characters using digits, spaces, +, -, or parentheses';
  }

  return errors;
}

export function CustomerFormModal({ open, customer, onClose, onSaved }: CustomerFormModalProps) {
  const isEditing = Boolean(customer);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setFirstName(customer?.firstName ?? '');
    setLastName(customer?.lastName ?? '');
    setEmail(customer?.email ?? '');
    setPhoneNumber(customer?.phoneNumber ?? '');
    setFormError(null);
    setFieldErrors({});
  }, [open, customer]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payload: CustomerRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    const validationErrors = validateCustomer(payload);
    if (
      validationErrors.firstName ||
      validationErrors.lastName ||
      validationErrors.email ||
      validationErrors.phoneNumber
    ) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const saved = customer
        ? await customersApi.update(customer.id, payload)
        : await customersApi.create(payload);
      onSaved(saved, customer ? 'edit' : 'create');
    } catch (error) {
      if (error instanceof ApiClientError) {
        const mapped: CustomerFieldErrors = {};
        for (const item of error.fieldErrors) {
          if (item.field === 'firstName' && !mapped.firstName) {
            mapped.firstName = item.message;
          } else if (item.field === 'lastName' && !mapped.lastName) {
            mapped.lastName = item.message;
          } else if (item.field === 'email' && !mapped.email) {
            mapped.email = item.message;
          } else if (item.field === 'phoneNumber' && !mapped.phoneNumber) {
            mapped.phoneNumber = item.message;
          }
        }
        setFieldErrors(mapped);
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Unable to save customer record. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit customer' : 'Add customer'}
      subtitle={
        isEditing
          ? 'Update customer contact details for future support calls.'
          : 'Create a customer contact record before logging support calls.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner title="Could not save customer" message={formError} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer-first-name" className="block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="customer-first-name"
              name="firstName"
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={fieldErrors.firstName ? 'customer-first-name-error' : undefined}
              placeholder="Elena"
              className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.firstName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
              }`}
            />
            {fieldErrors.firstName && (
              <p id="customer-first-name-error" className="mt-1.5 text-xs font-medium text-rose-600">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="customer-last-name" className="block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="customer-last-name"
              name="lastName"
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={fieldErrors.lastName ? 'customer-last-name-error' : undefined}
              placeholder="Rostova"
              className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.lastName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
              }`}
            />
            {fieldErrors.lastName && (
              <p id="customer-last-name-error" className="mt-1.5 text-xs font-medium text-rose-600">
                {fieldErrors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="customer-email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="customer-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'customer-email-error' : undefined}
            placeholder="elena.rostova@company.example"
            className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
            }`}
          />
          {fieldErrors.email && (
            <p id="customer-email-error" className="mt-1.5 text-xs font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="customer-phone" className="block text-sm font-medium text-slate-700">
            Phone number
          </label>
          <input
            id="customer-phone"
            name="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (fieldErrors.phoneNumber) {
                setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.phoneNumber)}
            aria-describedby={fieldErrors.phoneNumber ? 'customer-phone-error' : undefined}
            placeholder="+1 555 0101"
            className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              fieldErrors.phoneNumber
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
            }`}
          />
          {fieldErrors.phoneNumber && (
            <p id="customer-phone-error" className="mt-1.5 text-xs font-medium text-rose-600">
              {fieldErrors.phoneNumber}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save customer' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
