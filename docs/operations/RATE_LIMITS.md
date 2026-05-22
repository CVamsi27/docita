# Rate Limits

This table documents public or abuse-prone routes that must have explicit throttling.

| Surface                 | Route pattern                 | Expected protection                                    |
| ----------------------- | ----------------------------- | ------------------------------------------------------ |
| Login                   | `POST /auth/login`            | user/IP throttling, account lockout                    |
| Password reset          | `POST /auth/password-reset/*` | IP and identifier throttling                           |
| OTP/public verification | `POST /auth/*otp*`            | IP and identifier throttling                           |
| Public booking submit   | `POST /public-booking/*`      | tenant/IP throttling plus bot protection where enabled |
| Webhooks                | `POST /webhooks/*`            | signature verification before processing               |
| Upload sessions         | `POST /*upload*`              | short-lived capability token, mime and size validation |

Update this file when adding a public write path or changing a route-specific throttle.
