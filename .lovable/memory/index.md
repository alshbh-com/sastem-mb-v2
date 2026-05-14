# Project Memory

## Core
maka default brand. Multi-office branding (logo, watermark) via app_settings.
Admin/Vault master password: "01278006248" (editable via UI). Owner user: maka.
Phone number is unique customer ID; new orders update existing customer data.
Financial updates and status reversals MUST use DB Triggers to prevent double deduction.
Never hard-delete users or products; use NULL references to preserve financial history.
Agent reporting strictly uses `assigned_at`. Net Profit = (Products + Customer Shipping) - Agent Shipping.
Order reverted to Pending/Processing automatically clears `delivery_agent_id`.
Simplified checkout: DO NOT add discount, extra shipping, or prepaid shipping fields.

## Memories
- [Project Identity](mem://project/identity) — Dynamic branding, watermark, and invoice naming via app_settings
- [Daily Cashbox](mem://features/financials/daily-cashbox) — Auto-created daily zero-balance cashbox (e.g., خزنة YYYY-MM-DD)
- [Cart Sharing](mem://features/cart/sharing) — Cart sharing via encrypted URL containing items and variants
- [Payment Methods](mem://features/financials/payment-methods) — Transactions classified as Cash or Cash Transfer
- [Agent Deletion](mem://features/orders/agent-deletion) — Deleted agents' orders marked as agent_deleted
- [Pricing Tiers](mem://features/products/pricing-tiers) — Auto-applied quantity-based pricing (1-12 items)
- [Credentials](mem://auth/credentials) — Unified master password configuration
- [Simplified Checkout](mem://features/cart/simplified-checkout) — Checkout UI removes discount and extra shipping fields
- [Agent Summary](mem://features/agent-management/daily-summary) — Agent financial summary Net Value calculation formula
- [Order Rescheduling](mem://features/orders/rescheduling) — Shifting orders financial impact via assigned_at and payment_date
- [Data Integrity](mem://architecture/data-integrity) — DB Triggers for finances, NULL references for deleted entities
- [History Preservation](mem://logic/order-history-preservation) — Returns table usage and preserving agent assignment on returns
- [Theming System](mem://style/theming-system) — 15 color themes and 10 design templates via Appearance admin
- [Office Branding](mem://features/admin/office-branding) — Multi-office support for invoice logos and watermarks
- [Workflow Reversion](mem://logic/order-workflow-reversion) — Auto-clear agent assignment on Pending/Processing status
- [Customer Integrity](mem://logic/customer-data-integrity) — Phone number as unique customer ID logic
- [Agent Reporting Date](mem://logic/agent-reporting-date) — Strict use of assigned_at for agent reports and filters
- [Auto Shipping Calc](mem://logic/automatic-shipping-calculation) — Agent shipping cost auto-set based on governorate
- [Product Deletion Safety](mem://logic/product-deletion-safety) — Nullify order_items product references to keep history
- [Status Financial Reversal](mem://logic/status-based-financial-reversal) — DB triggers auto-delete payments on status revert
- [Invoice Standard Elements](mem://features/admin/invoice-standard-elements) — Fixed Arabic warning text and required invoice fields
- [Invoice Enhancements](mem://features/admin/invoice-enhancements) — 2x2 grid A4 layout, search, and copies for printing
- [WhatsApp Sharing](mem://features/agent-management/whatsapp-sharing) — Formatted order list text generation for WhatsApp
