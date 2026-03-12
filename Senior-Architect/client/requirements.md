## Packages
framer-motion | Smooth page transitions and micro-interactions
recharts | Beautiful analytics charts for metrics and dashboard
date-fns | Reliable date parsing and formatting

## Notes
- App uses JWT authentication stored in localStorage as 'auth_token'
- All authenticated requests must include the `Authorization: Bearer <token>` header
- We use a custom fetch wrapper (`client/src/lib/fetcher.ts`) to intercept and inject the token seamlessly
