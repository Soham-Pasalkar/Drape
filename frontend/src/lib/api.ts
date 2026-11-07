/**
 * DRAPE Frontend API Integration Client.
 * 
 * Provides typed methods for backend connectivity, health verification,
 * customer authentication, user profile management, and independent consent preferences,
 * with error handling conforming to RFC 9457 Problem Details.
 */

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ReadyResponse {
  status: "ready" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: "connected" | "disconnected";
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  invalid_params?: Array<{ loc: string[]; msg: string; type: string }>;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  roles: string[];
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  user: User;
}

export interface UserConsent {
  user_id: string;
  camera_processing_opt_in: boolean;
  ai_tryon_storage_opt_in: boolean;
  marketing_emails_opt_in: boolean;
  analytics_opt_in: boolean;
  updated_at: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  camera_processing_opt_in?: boolean;
  ai_tryon_storage_opt_in?: boolean;
  marketing_emails_opt_in?: boolean;
  analytics_opt_in?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserUpdatePayload {
  first_name?: string | null;
  last_name?: string | null;
}

export interface ConsentUpdatePayload {
  camera_processing_opt_in?: boolean;
  ai_tryon_storage_opt_in?: boolean;
  marketing_emails_opt_in?: boolean;
  analytics_opt_in?: boolean;
}

export interface ColorOption {
  name: string;
  code: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  material: string | null;
  description?: string | null;
  featured: boolean;
  primary_image: string | null;
  available_colors: ColorOption[];
  available_sizes: string[];
  in_stock: boolean;
  try_on_enabled: boolean;
}

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  color_code: string | null;
  is_active: boolean;
  available_quantity: number;
  in_stock: boolean;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  material: string | null;
  care_instructions: string | null;
  featured: boolean;
  is_active: boolean;
  model_3d_url: string | null;
  model_3d_format: string | null;
  model_3d_status: string;
  try_on_enabled: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface CategorySummary {
  name: string;
  count: number;
}

export interface ProductListResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  categories: CategorySummary[];
}

export interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku: string;
  size: string;
  color: string;
  color_code: string | null;
  unit_price: number;
  currency: string;
  quantity: number;
  line_total: number;
  primary_image: string | null;
  available_quantity: number;
  in_stock: boolean;
}

export interface Cart {
  id: string;
  guest_token: string | null;
  items: CartItem[];
  total_items: number;
  subtotal: number;
  currency: string;
}

export interface ProductFilterParams {
  category?: string;
  min_price?: number;
  max_price?: number;
  size?: string;
  color?: string;
  q?: string;
  sort_by?: "featured" | "price_asc" | "price_desc" | "newest";
  page?: number;
  page_size?: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Custom error class wrapping RFC 9457 Problem Details.
 */
export class ApiError extends Error {
  public problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title || "An API error occurred");
    this.name = "ApiError";
    this.problem = problem;
  }
}

/**
 * Helper to process API responses and parse RFC 9457 errors.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let problem: ProblemDetails;
    try {
      problem = await response.json();
    } catch {
      problem = {
        type: `https://api.drape.fashion/errors/http-${response.status}`,
        title: response.statusText || "HTTP Error",
        status: response.status,
        detail: `Request failed with status code ${response.status}`,
        instance: response.url,
      };
    }
    throw new ApiError(problem);
  }
  return await response.json();
}

/**
 * Checks backend liveness probe via GET /healthz.
 */
export async function fetchBackendHealth(): Promise<HealthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/healthz`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return await handleResponse<HealthResponse>(response);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) throw error;
    throw new Error("Unable to establish connection with DRAPE API backend.");
  }
}

/**
 * Checks backend readiness probe via GET /readyz.
 */
export async function fetchBackendReadiness(): Promise<ReadyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/readyz`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return await handleResponse<ReadyResponse>(response);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) throw error;
    throw new Error("Unable to reach DRAPE API readiness endpoint.");
  }
}

/**
 * Safe fetch wrapper providing friendly network error translations
 * across browsers (Safari WebKit "Load failed" -> actionable guidance).
 */
export async function drapeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to the DRAPE API backend. Please ensure the backend is running on http://localhost:8000."
      );
    }
    throw error;
  }
}

/**
 * Register a new customer account via POST /api/v1/auth/register.
 */
export async function registerCustomer(
  payload: RegisterPayload
): Promise<AuthTokenResponse> {
  const response = await drapeFetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<AuthTokenResponse>(response);
}

/**
 * Authenticate customer credentials via POST /api/v1/auth/login.
 */
export async function loginCustomer(
  payload: LoginPayload
): Promise<AuthTokenResponse> {
  const response = await drapeFetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<AuthTokenResponse>(response);
}

/**
 * Refresh customer session via POST /api/v1/auth/refresh.
 */
export async function refreshCustomerSession(
  refreshToken?: string
): Promise<AuthTokenResponse> {
  const response = await drapeFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return await handleResponse<AuthTokenResponse>(response);
}

/**
 * Terminate active customer session via POST /api/v1/auth/logout.
 */
export async function logoutCustomer(
  accessToken?: string | null
): Promise<{ message: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await drapeFetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers,
    credentials: "include",
  });
  return await handleResponse<{ message: string }>(response);
}

/**
 * Retrieve authenticated customer profile via GET /api/v1/users/me.
 */
export async function fetchMyProfile(
  accessToken?: string | null
): Promise<User> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await drapeFetch(`${API_BASE_URL}/api/v1/users/me`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<User>(response);
}

/**
 * Update authenticated customer profile via PATCH /api/v1/users/me.
 */
export async function updateMyProfile(
  payload: UserUpdatePayload,
  accessToken?: string | null
): Promise<User> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await drapeFetch(`${API_BASE_URL}/api/v1/users/me`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<User>(response);
}

/**
 * Retrieve customer consent preferences via GET /api/v1/users/me/consents.
 */
export async function fetchMyConsents(
  accessToken?: string | null
): Promise<UserConsent> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await drapeFetch(`${API_BASE_URL}/api/v1/users/me/consents`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<UserConsent>(response);
}

/**
 * Update independent consent preferences via PATCH /api/v1/users/me/consents.
 */
export async function updateMyConsents(
  payload: ConsentUpdatePayload,
  accessToken?: string | null
): Promise<UserConsent> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await drapeFetch(`${API_BASE_URL}/api/v1/users/me/consents`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<UserConsent>(response);
}

/**
 * Fetch catalog products with filtering, search, sorting, and pagination.
 */
export async function fetchProducts(
  params?: ProductFilterParams
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.min_price !== undefined) query.set("min_price", params.min_price.toString());
  if (params?.max_price !== undefined) query.set("max_price", params.max_price.toString());
  if (params?.size) query.set("size", params.size);
  if (params?.color) query.set("color", params.color);
  if (params?.q) query.set("q", params.q);
  if (params?.sort_by) query.set("sort_by", params.sort_by);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.page_size) query.set("page_size", params.page_size.toString());

  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/v1/products${qs}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return await handleResponse<ProductListResponse>(response);
}

/**
 * Fetch a single product by UUID or slug.
 */
export async function fetchProduct(idOrSlug: string): Promise<ProductDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/products/${encodeURIComponent(idOrSlug)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return await handleResponse<ProductDetail>(response);
}

/**
 * Fetch catalog categories and product counts.
 */
export async function fetchCategories(): Promise<{ categories: CategorySummary[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/products/categories`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return await handleResponse<{ categories: CategorySummary[] }>(response);
}

/**
 * Retrieve active customer or guest cart.
 */
export async function fetchCart(
  guestToken?: string | null,
  accessToken?: string | null
): Promise<Cart> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/cart`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<Cart>(response);
}

/**
 * Add product variant to active cart.
 */
export async function addToCart(
  variantId: string,
  quantity = 1,
  guestToken?: string | null,
  accessToken?: string | null
): Promise<Cart> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/cart/items`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  return await handleResponse<Cart>(response);
}

/**
 * Update cart item quantity or change variant.
 */
export async function updateCartItem(
  itemId: string,
  payload: { quantity?: number; variant_id?: string },
  guestToken?: string | null,
  accessToken?: string | null
): Promise<Cart> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Cart>(response);
}

/**
 * Remove an item from the cart.
 */
export async function removeCartItem(
  itemId: string,
  guestToken?: string | null,
  accessToken?: string | null
): Promise<Cart> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return await handleResponse<Cart>(response);
}

/**
 * Merge anonymous guest cart into authenticated customer cart.
 */
export async function mergeGuestCart(
  guestToken: string,
  accessToken?: string | null
): Promise<Cart> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/cart/merge`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ guest_token: guestToken }),
  });
  return await handleResponse<Cart>(response);
}

// ==========================================
// MILESTONE 3: ADDRESSES, CHECKOUT, PAYMENTS & ORDERS
// ==========================================

export interface Address {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressCreatePayload {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  address_type?: string;
  is_default?: boolean;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  amount: number;
  estimated_days: string;
  is_complimentary: boolean;
}

export interface CheckoutQuote {
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  currency: string;
  shipping_options: ShippingOption[];
  qualifies_for_free_standard_shipping: boolean;
  free_shipping_threshold: number;
}

export interface OrderItem {
  id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderStatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  failure_reason?: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_method: string;
  shipping_address_snapshot: AddressCreatePayload;
  customer_notes?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  payments?: PaymentRecord[];
  status_history?: OrderStatusHistoryItem[];
}

export interface RazorpayCreateSessionResponse {
  order_id: string;
  razorpay_order_id: string;
  amount_cents: number;
  currency: string;
  key_id: string;
  order_number: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  transaction_id: string;
  message: string;
}

/**
 * Fetch saved delivery addresses for the authenticated customer.
 */
export async function getAddresses(accessToken?: string | null): Promise<Address[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<Address[]>(response);
}

/**
 * Create a new saved delivery address.
 */
export async function createAddress(
  payload: AddressCreatePayload,
  accessToken?: string | null
): Promise<Address> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/addresses`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Address>(response);
}

/**
 * Update an existing delivery address.
 */
export async function updateAddress(
  addressId: string,
  payload: Partial<AddressCreatePayload>,
  accessToken?: string | null
): Promise<Address> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Address>(response);
}

/**
 * Delete a saved delivery address.
 */
export async function deleteAddress(
  addressId: string,
  accessToken?: string | null
): Promise<{ status: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return await handleResponse<{ status: string }>(response);
}

/**
 * Set an address as primary default.
 */
export async function setDefaultAddress(
  addressId: string,
  accessToken?: string | null
): Promise<Address> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/addresses/${encodeURIComponent(addressId)}/default`, {
    method: "POST",
    headers,
    credentials: "include",
  });
  return await handleResponse<Address>(response);
}

/**
 * Request real-time server-side tax quote and shipping options.
 */
export async function getCheckoutQuote(
  destination: { country?: string; state?: string; postal_code?: string },
  guestToken?: string | null,
  accessToken?: string | null
): Promise<CheckoutQuote> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/checkout/quote`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(destination),
  });
  return await handleResponse<CheckoutQuote>(response);
}

/**
 * Create a pending order from current cart and shipping destination.
 */
export async function createCheckoutOrder(
  payload: {
    shipping_address: AddressCreatePayload;
    shipping_method: string;
    customer_notes?: string;
  },
  guestToken?: string | null,
  accessToken?: string | null
): Promise<Order> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (guestToken) headers["X-Guest-Token"] = guestToken;

  const response = await fetch(`${API_BASE_URL}/api/v1/checkout/orders`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Order>(response);
}

/**
 * Create Razorpay payment session for a pending order.
 */
export async function createRazorpayPaymentSession(
  orderId: string,
  accessToken?: string | null
): Promise<RazorpayCreateSessionResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/razorpay/create`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ order_id: orderId }),
  });
  return await handleResponse<RazorpayCreateSessionResponse>(response);
}

/**
 * Verify Razorpay HMAC signature and confirm order.
 */
export async function verifyRazorpayPayment(
  payload: {
    order_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  accessToken?: string | null
): Promise<RazorpayVerifyResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/razorpay/verify`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<RazorpayVerifyResponse>(response);
}

/**
 * List orders for the authenticated customer.
 */
export async function getOrders(accessToken?: string | null): Promise<Order[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<Order[]>(response);
}

/**
 * Fetch a specific order by UUID or order number.
 */
export async function getOrderById(
  idOrNumber: string,
  accessToken?: string | null
): Promise<Order> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/orders/${encodeURIComponent(idOrNumber)}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<Order>(response);
}

// ============================================================================
// MILESTONE 4: SMART DIGITAL WARDROBE & OUTFITS
// ============================================================================

export interface WardrobeItem {
  id: string;
  user_id: string;
  product_id?: string | null;
  order_item_id?: string | null;
  source: "purchased" | "manual";
  name: string;
  brand?: string | null;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  color: string;
  secondary_color?: string | null;
  size?: string | null;
  material?: string | null;
  season?: string | null;
  occasion?: string | null;
  image_url?: string | null;
  purchase_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WardrobeItemListResponse {
  items: WardrobeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface WardrobeItemCreatePayload {
  name: string;
  brand?: string;
  category: string;
  subcategory?: string;
  description?: string;
  color: string;
  secondary_color?: string;
  size?: string;
  material?: string;
  season?: string;
  occasion?: string;
  image_url?: string;
  purchase_date?: string;
}

export interface WardrobeItemUpdatePayload {
  name?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  color?: string;
  secondary_color?: string;
  size?: string;
  material?: string;
  season?: string;
  occasion?: string;
  image_url?: string;
  purchase_date?: string;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  wardrobe_item_id: string;
  display_order: number;
  created_at: string;
  wardrobe_item?: WardrobeItem | null;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  occasion?: string | null;
  season?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
  items: OutfitItem[];
}

export interface OutfitListResponse {
  outfits: Outfit[];
  total: number;
}

export interface OutfitCreatePayload {
  name: string;
  description?: string;
  occasion?: string;
  season?: string;
  cover_image_url?: string;
  item_ids?: string[];
}

export interface OutfitUpdatePayload {
  name?: string;
  description?: string;
  occasion?: string;
  season?: string;
  cover_image_url?: string;
}

export interface ImportPurchasesResponse {
  created_count: number;
  skipped_count: number;
  items: WardrobeItem[];
}

export interface WardrobeFilterParams {
  category?: string;
  color?: string;
  season?: string;
  occasion?: string;
  source?: string;
  search?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}

/**
 * List wardrobe garments for the authenticated customer.
 */
export async function getWardrobeItems(
  params?: WardrobeFilterParams,
  accessToken?: string | null
): Promise<WardrobeItemListResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set("category", params.category);
  if (params?.color) queryParams.set("color", params.color);
  if (params?.season) queryParams.set("season", params.season);
  if (params?.occasion) queryParams.set("occasion", params.occasion);
  if (params?.source) queryParams.set("source", params.source);
  if (params?.search) queryParams.set("search", params.search);
  if (params?.sort_by) queryParams.set("sort_by", params.sort_by);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/api/v1/wardrobe${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<WardrobeItemListResponse>(response);
}

/**
 * Add a manual garment to customer's wardrobe.
 */
export async function createWardrobeItem(
  payload: WardrobeItemCreatePayload,
  accessToken?: string | null
): Promise<WardrobeItem> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<WardrobeItem>(response);
}

/**
 * Retrieve a specific wardrobe item.
 */
export async function getWardrobeItem(
  id: string,
  accessToken?: string | null
): Promise<WardrobeItem> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/${encodeURIComponent(id)}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<WardrobeItem>(response);
}

/**
 * Update a wardrobe garment.
 */
export async function updateWardrobeItem(
  id: string,
  payload: WardrobeItemUpdatePayload,
  accessToken?: string | null
): Promise<WardrobeItem> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<WardrobeItem>(response);
}

/**
 * Delete a wardrobe garment.
 */
export async function deleteWardrobeItem(
  id: string,
  accessToken?: string | null
): Promise<{ status: string; message: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return await handleResponse<{ status: string; message: string }>(response);
}

/**
 * Import a single purchased item from order history.
 */
export async function addWardrobeItemFromPurchase(
  orderItemId: string,
  accessToken?: string | null
): Promise<WardrobeItem> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/from-purchase/${encodeURIComponent(orderItemId)}`, {
    method: "POST",
    headers,
    credentials: "include",
  });
  return await handleResponse<WardrobeItem>(response);
}

/**
 * Bulk import all eligible purchased items from customer's order history.
 */
export async function importAllPurchases(
  accessToken?: string | null
): Promise<ImportPurchasesResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/import-purchases`, {
    method: "POST",
    headers,
    credentials: "include",
  });
  return await handleResponse<ImportPurchasesResponse>(response);
}

/**
 * List all saved outfits.
 */
export async function getOutfits(
  accessToken?: string | null
): Promise<OutfitListResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<OutfitListResponse>(response);
}

/**
 * Create a new curated outfit ensemble.
 */
export async function createOutfit(
  payload: OutfitCreatePayload,
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Outfit>(response);
}

/**
 * Retrieve a specific outfit with member garments.
 */
export async function getOutfit(
  id: string,
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(id)}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<Outfit>(response);
}

/**
 * Update outfit metadata.
 */
export async function updateOutfit(
  id: string,
  payload: OutfitUpdatePayload,
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<Outfit>(response);
}

/**
 * Delete an outfit.
 */
export async function deleteOutfit(
  id: string,
  accessToken?: string | null
): Promise<{ status: string; message: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return await handleResponse<{ status: string; message: string }>(response);
}

/**
 * Add a wardrobe garment to an outfit ensemble.
 */
export async function addItemToOutfit(
  outfitId: string,
  wardrobeItemId: string,
  displayOrder: number = 0,
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(outfitId)}/items`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ wardrobe_item_id: wardrobeItemId, display_order: displayOrder }),
  });
  return await handleResponse<Outfit>(response);
}

/**
 * Remove a garment from an outfit ensemble.
 */
export async function removeItemFromOutfit(
  outfitId: string,
  wardrobeItemId: string,
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(outfitId)}/items/${encodeURIComponent(wardrobeItemId)}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  return await handleResponse<Outfit>(response);
}

/**
 * Reorder garments within an outfit ensemble.
 */
export async function reorderOutfitItems(
  outfitId: string,
  itemIds: string[],
  accessToken?: string | null
): Promise<Outfit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/outfits/${encodeURIComponent(outfitId)}/items/reorder`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify({ item_ids: itemIds }),
  });
  return await handleResponse<Outfit>(response);
}

// =============================================================================
// SMART WARDROBE ANALYTICS & STYLIST ENGINE EXTENSIONS
// =============================================================================

export interface WardrobeStats {
  total_items: number;
  total_outfits: number;
  by_category: Record<string, number>;
  by_color: Record<string, number>;
  by_occasion: Record<string, number>;
  by_season: Record<string, number>;
  recent_additions: WardrobeItem[];
  try_on_ready_count: number;
}

export interface StylistPreferences {
  id?: string;
  user_id?: string;
  style_direction: string;
  favorite_occasions: string[];
  favorite_colors: string[];
  excluded_colors: string[];
  preferred_season?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OutfitRecommendationItem {
  role: string;
  wardrobe_item: WardrobeItem;
}

export interface OutfitRecommendation {
  id: string;
  title: string;
  occasion: string;
  season: string;
  score: number;
  score_breakdown: {
    category_compatibility: number;
    color_harmony: number;
    occasion_suitability: number;
    preference_match: number;
    novelty: number;
  };
  stylist_notes: string;
  items: OutfitRecommendationItem[];
  is_saved: boolean;
  recommendation_hash: string;
}

export interface OutfitRecommendationListResponse {
  occasion?: string | null;
  total_generated: number;
  recommendations: OutfitRecommendation[];
}

export interface OutfitFeedbackPayload {
  outfit_id?: string | null;
  recommendation_hash?: string | null;
  action: "like" | "dislike" | "save" | "skip" | "worn";
  notes?: string | null;
}

export interface OutfitFeedbackResponse {
  success: boolean;
  action: string;
  message: string;
  saved_outfit_id?: string | null;
}

export interface ComplementaryProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url?: string | null;
  color: string;
  colors: string[];
  reason: string;
  compatible_try_on: boolean;
  product_slug: string;
}

export interface CompleteLookResponse {
  missing_categories: string[];
  owned_categories: string[];
  total_owned: number;
  suggestions: ComplementaryProduct[];
}

/**
 * Get wardrobe analytics and counts.
 */
export async function getWardrobeStats(accessToken?: string | null): Promise<WardrobeStats> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/stats`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<WardrobeStats>(response);
}

/**
 * Get styling preferences for the customer.
 */
export async function getStylistPreferences(accessToken?: string | null): Promise<StylistPreferences> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/preferences`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<StylistPreferences>(response);
}

/**
 * Update styling preferences for the customer.
 */
export async function updateStylistPreferences(
  payload: Partial<StylistPreferences>,
  accessToken?: string | null
): Promise<StylistPreferences> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/preferences`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<StylistPreferences>(response);
}

/**
 * Generate intelligent outfit recommendations from customer's wardrobe.
 */
export async function generateOutfitRecommendations(
  params?: { occasion?: string; season?: string; limit?: number },
  accessToken?: string | null
): Promise<OutfitRecommendationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.occasion) searchParams.set("occasion", params.occasion);
  if (params?.season) searchParams.set("season", params.season);
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  const queryString = searchParams.toString();

  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(
    `${API_BASE_URL}/api/v1/wardrobe/recommendations/generate${queryString ? `?${queryString}` : ""}`,
    {
      method: "POST",
      headers,
      credentials: "include",
    }
  );
  return await handleResponse<OutfitRecommendationListResponse>(response);
}

/**
 * Submit feedback on an outfit recommendation (like, dislike, save, skip, worn).
 */
export async function submitOutfitFeedback(
  payload: OutfitFeedbackPayload,
  accessToken?: string | null
): Promise<OutfitFeedbackResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/recommendations/feedback`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return await handleResponse<OutfitFeedbackResponse>(response);
}

/**
 * Get catalog gap analysis suggestions to complete user's wardrobe.
 */
export async function getCompleteLookRecommendations(
  accessToken?: string | null
): Promise<CompleteLookResponse> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}/api/v1/wardrobe/complete-look`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  return await handleResponse<CompleteLookResponse>(response);
}

