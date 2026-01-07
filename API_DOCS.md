# OLX-like Marketplace API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

---

## Authentication Endpoints

### 1. Sign Up
**POST** `/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "location": "New York"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": { ... },
  "session": { ... }
}
```

### 2. Login
**POST** `/auth/login`

Authenticate and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "session": {
    "access_token": "eyJhbGc...",
    ...
  }
}
```

### 3. Logout
**POST** `/auth/logout`

Requires authentication.

**Response:**
```json
{
  "message": "Logout successful"
}
```

### 4. Get Current User
**GET** `/auth/me`

Requires authentication.

**Response:**
```json
{
  "user": { ... },
  "profile": { ... }
}
```

---

## Product Endpoints

### 1. Create Product
**POST** `/products`

Requires authentication.

**Request Body:**
```json
{
  "title": "iPhone 13 Pro",
  "description": "Excellent condition, barely used",
  "price": 899.99,
  "category_id": "uuid-here",
  "condition": "like_new",
  "location": "San Francisco",
  "status": "active",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Response:**
```json
{
  "message": "Product created successfully",
  "product": { ... }
}
```

### 2. Get All Products
**GET** `/products`

**Query Parameters:**
- `category_id` (optional) - Filter by category UUID
- `status` (optional) - Filter by status: active, sold, draft, archived
- `min_price` (optional) - Minimum price
- `max_price` (optional) - Maximum price
- `condition` (optional) - Filter by condition: new, like_new, good, fair, poor
- `search` (optional) - Search in title and description
- `user_id` (optional) - Filter by seller (requires auth if viewing own products)
- `limit` (optional, default: 20) - Number of results per page
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "products": [ ... ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. Get Product by ID
**GET** `/products/:id`

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "title": "iPhone 13 Pro",
    "description": "...",
    "price": 899.99,
    "status": "active",
    "condition": "like_new",
    "location": "San Francisco",
    "views": 42,
    "category": { ... },
    "seller": { ... },
    "images": [ ... ],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Update Product
**PUT** `/products/:id`

Requires authentication. Only owner can update.

**Request Body:**
```json
{
  "title": "Updated Title",
  "price": 799.99,
  "status": "active"
}
```

### 5. Delete Product
**DELETE** `/products/:id`

Requires authentication. Only owner can delete.

### 6. Update Product Status
**PATCH** `/products/:id/status`

Requires authentication. Quickly change product status.

**Request Body:**
```json
{
  "status": "sold"
}
```

---

## Category Endpoints

### 1. Get All Categories
**GET** `/categories`

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "...",
      "icon": "📱"
    }
  ]
}
```

### 2. Get Category by ID
**GET** `/categories/:id`

### 3. Get Products in Category
**GET** `/categories/:id/products`

**Query Parameters:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

---

## Profile Endpoints

### 1. Get Own Profile
**GET** `/profile`

Requires authentication.

### 2. Update Profile
**PUT** `/profile`

Requires authentication.

**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "phone": "+1234567890",
  "location": "Los Angeles",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

### 3. Get User's Listings
**GET** `/profile/listings`

Requires authentication.

**Query Parameters:**
- `status` (optional) - Filter by status

### 4. Get Public Profile
**GET** `/profile/:id`

Get public profile information of any user.

---

## Favorites Endpoints

### 1. Get Favorites
**GET** `/favorites`

Requires authentication.

**Response:**
```json
{
  "favorites": [
    {
      "id": "uuid",
      "product": { ... },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Add to Favorites
**POST** `/favorites`

Requires authentication.

**Request Body:**
```json
{
  "product_id": "uuid"
}
```

### 3. Remove from Favorites
**DELETE** `/favorites/:product_id`

Requires authentication.

### 4. Check Favorite Status
**GET** `/favorites/check/:product_id`

Requires authentication.

**Response:**
```json
{
  "isFavorite": true
}
```

---

## Product Status Values

- `draft` - Not visible to others, work in progress
- `active` - Live and visible to everyone
- `sold` - Marked as sold
- `archived` - Hidden from active listings

## Product Condition Values

- `new` - Brand new, never used
- `like_new` - Barely used, excellent condition
- `good` - Used but well maintained
- `fair` - Shows signs of use
- `poor` - Heavy wear, may need repairs

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
