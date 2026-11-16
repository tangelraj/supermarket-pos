
import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/api";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const response = await getCustomers();
      const data = response.data;

      setCustomers(
        Array.isArray(data) ? data : data.results ?? []
      );
    } catch (err) {
      console.error(err);
      setError(
        [401, 403].includes(err.response?.status)
          ? "Staff authentication is required to view customers."
          : "Unable to load customers from Django."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setFormError("Enter a valid 10-digit phone number.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim(),
      };

      if (editingId !== null) {
        await updateCustomer(editingId, payload);
        setSuccess("Customer updated successfully.");
      } else {
        await addCustomer(payload);
        setSuccess("Customer added successfully.");
      }

      setModalOpen(false);
      await loadCustomers();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;
      const message =
        data?.phone?.[0] ||
        data?.email?.[0] ||
        data?.name?.[0] ||
        data?.detail ||
        "Unable to save customer.";

      setFormError(
        [401, 403].includes(err.response?.status)
          ? "Staff authentication is required."
          : message
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteCustomer(customer.id);
      setSuccess("Customer deleted successfully.");
      await loadCustomers();
    } catch (err) {
      console.error(err);
      setError(
        [401, 403].includes(err.response?.status)
          ? "Staff authentication is required."
          : "Unable to delete customer."
      );
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = search.toLowerCase().trim();

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      (customer.email || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="customers-page">
      <div className="customers-heading">
        <div>
          <h1>Customers Management</h1>
          <p>Manage supermarket customer details</p>
        </div>

        <button
          type="button"
          className="customers-add-btn"
          onClick={openAdd}
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {error && (
        <p className="customers-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="customers-success" role="status">
          {success}
        </p>
      )}

      <div className="customers-summary">
        <Users size={28} />
        <div>
          <span>Total Customers</span>
          <h2>{customers.length}</h2>
        </div>
      </div>

      <div className="customers-toolbar">
        <div className="customers-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search name, phone or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          className="customers-refresh"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="customers-table-wrap">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5">Loading customers...</td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="5">No customers found.</td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || "-"}</td>
                  <td>{customer.address || "-"}</td>
                  <td>
                    <div className="customers-actions">
                      <button
                        type="button"
                        onClick={() => openEdit(customer)}
                        aria-label={`Edit ${customer.name}`}
                        className="customers-edit"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(customer)}
                        aria-label={`Delete ${customer.name}`}
                        className="customers-delete"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="customers-modal-overlay">
          <div
            className="customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
          >
            <div className="customers-modal-header">
              <h2 id="customer-modal-title">
                {editingId !== null
                  ? "Edit Customer"
                  : "Add Customer"}
              </h2>

              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="customer-name">
                Customer Name *
              </label>
              <input
                id="customer-name"
                name="name"
                value={form.name}
                onChange={updateField}
                required
                placeholder="Enter customer name"
              />

              <label htmlFor="customer-phone">
                Phone Number *
              </label>
              <input
                id="customer-phone"
                name="phone"
                value={form.phone}
                onChange={updateField}
                required
                maxLength={10}
                inputMode="numeric"
                placeholder="10-digit phone number"
              />

              <label htmlFor="customer-email">Email</label>
              <input
                id="customer-email"
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="customer@example.com"
              />

              <label htmlFor="customer-address">Address</label>
              <textarea
                id="customer-address"
                name="address"
                value={form.address}
                onChange={updateField}
                rows={3}
                placeholder="Enter address"
              />

              {formError && (
                <p className="customers-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="customers-modal-actions">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customers-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Customer"
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
