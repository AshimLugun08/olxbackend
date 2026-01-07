# OLX-like Marketplace Backend

A complete backend API for a classified ads marketplace similar to OLX, built with Express.js and Supabase.

## Features

- User authentication (signup, login, logout)
- Product listings with CRUD operations
- Product status management (draft, active, sold, archived)
- Multiple product images support
- Categories and subcategories
- Advanced search and filtering
- User profiles
- Favorites/wishlist functionality
- View tracking
- Secure Row Level Security (RLS) policies

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **PostgreSQL** - Database (via Supabase)
- **JWT** - Token-based authentication

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Running in Production

```bash
npm start
```

## API Documentation

See [API_DOCS.md](./API_DOCS.md) for complete API documentation.

## Database Schema

The database includes the following tables:

- **profiles** - Extended user information
- **categories** - Product categories
- **products** - Product listings
- **product_images** - Product images
- **favorites** - User favorites

## API Endpoints Overview

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `POST /api/products` - Create product
- `GET /api/products` - List products (with filtering)
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/status` - Update product status

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category details
- `GET /api/categories/:id/products` - Get products in category

### Profile
- `GET /api/profile` - Get own profile
- `PUT /api/profile` - Update profile
- `GET /api/profile/listings` - Get user's listings
- `GET /api/profile/:id` - Get public profile

### Favorites
- `GET /api/favorites` - Get favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:product_id` - Remove from favorites
- `GET /api/favorites/check/:product_id` - Check favorite status

## Security

- All tables have Row Level Security (RLS) enabled
- JWT-based authentication
- Secure password handling via Supabase Auth
- Protected routes with authentication middleware
- Input validation on all endpoints

## Project Structure

```
project/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication routes
│   │   ├── products.routes.js   # Product routes
│   │   ├── categories.routes.js # Category routes
│   │   ├── profile.routes.js    # Profile routes
│   │   └── favorites.routes.js  # Favorites routes
│   └── server.js                # Main server file
├── .env                         # Environment variables
├── package.json
└── README.md
```
