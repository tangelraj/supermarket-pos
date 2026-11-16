
import axios from "axios";

// ============================================================
// API CONFIGURATION
// ============================================================

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api/",

  timeout: 30000,

  // Required for Django session authentication
  withCredentials: true,

  // CSRF settings for local same-origin cookie access.
  // Cross-origin requests use the token returned by Django.
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  withXSRFToken: true,
});


// ============================================================
// CSRF TOKEN MANAGEMENT
// ============================================================

// Token received from GET /api/auth/session/
let csrfToken = null;

export const setCsrfToken = (token) => {
  csrfToken = token || null;
};

// Automatically attach the latest token to unsafe requests.
api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();

  if (
    ["post", "put", "patch", "delete"].includes(method) &&
    csrfToken
  ) {
    config.headers.set("X-CSRFToken", csrfToken);
  }

  return config;
});


// ============================================================
// HEALTH
// ============================================================

export const getHealth = () =>
  api.get("health/");


// ============================================================
// PRODUCTS
// ============================================================

export const getProducts = (params = {}) =>
  api.get("products/", { params });

export const getCategories = () =>
  api.get("categories/");


// ============================================================
// POS BILLING
// ============================================================

export const checkoutSale = (data) =>
  api.post("sales/checkout/", data);


// ============================================================
// SALES HISTORY
// ============================================================

export const getSalesHistory = () =>
  api.get("sales/history/");


// ============================================================
// INVENTORY
// ============================================================

export const restockProduct = (productId, quantity) =>
  api.post(
    `products/${productId}/restock/`,
    { quantity }
  );


// ============================================================
// CUSTOMERS
// ============================================================

export const getCustomers = () =>
  api.get("customers/");

export const addCustomer = (data) =>
  api.post("customers/", data);

export const updateCustomer = (id, data) =>
  api.patch(`customers/${id}/`, data);

export const deleteCustomer = (id) =>
  api.delete(`customers/${id}/`);


// ============================================================
// AUTHENTICATION
// ============================================================

// Fetch session status and the Django CSRF token.
export const getSession = async () => {
  const response = await api.get("auth/session/");

  if (response.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  }

  return response;
};


// Login using a fresh CSRF token.
export const loginStaff = async (username, password) => {
  // Get a fresh CSRF token before login.
  await getSession();

  const response = await api.post(
    "auth/login/",
    { username, password }
  );

  // Django rotates the CSRF token after login.
  if (response.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  } else {
    await getSession();
  }

  return response;
};


// Logout using a fresh CSRF token.
export const logoutStaff = async () => {
  await getSession();

  const response = await api.post(
    "auth/logout/",
    {}
  );

  setCsrfToken(null);

  return response;
};


export default api;
