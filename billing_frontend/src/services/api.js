
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api/",
  timeout: 10000,

  // Send Django session cookies
  withCredentials: true,

  // Django CSRF configuration
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  withXSRFToken: true,
});

function getCookie(name) {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

// Health
export const getHealth = () => api.get("health/");

// Products
export const getProducts = (params = {}) =>
  api.get("products/", { params });

export const getCategories = () =>
  api.get("categories/");

// POS Billing
export const checkoutSale = (data) =>
  api.post("sales/checkout/", data);

// Sales History
export const getSalesHistory = () =>
  api.get("sales/history/");

// Inventory
export const restockProduct = (productId, quantity) =>
  api.post(`products/${productId}/restock/`, {
    quantity,
  });

// Customers
export const getCustomers = () =>
  api.get("customers/");

export const addCustomer = (data) =>
  api.post("customers/", data);

export const updateCustomer = (id, data) =>
  api.patch(`customers/${id}/`, data);

export const deleteCustomer = (id) =>
  api.delete(`customers/${id}/`);

// Authentication
export const getSession = () =>
  api.get("auth/session/");

export const loginStaff = (username, password) =>
  api.post(
    "auth/login/",
    { username, password },
    {
      headers: {
        "X-CSRFToken": getCookie("csrftoken") || "",
      },
    }
  );

export const logoutStaff = () =>
  api.post(
    "auth/logout/",
    {},
    {
      headers: {
        "X-CSRFToken": getCookie("csrftoken") || "",
      },
    }
  );

export default api;
