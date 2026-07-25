# GoHighLevel — The Complete Platform Reference

Every module, function, and workflow — explained in depth.

## What is GoHighLevel?

GoHighLevel (GHL) is an all-in-one sales and marketing platform built primarily for marketing agencies, coaches, consultants, and SaaS operators. Launched in 2018, it consolidates the functionality of dozens of tools — CRM, funnel builder, email marketing, SMS, booking, automation, reputation management, membership sites, and more — into a single platform that can be white-labelled and resold as an agency's own product.

The architecture has two layers: an Agency account (the top-level owner) and Sub-Accounts (each client location). Everything built at the agency level can be deployed across unlimited sub-accounts, making GHL extremely powerful for agencies that serve multiple clients with similar needs.

> **KEY CONCEPT:** Agency = you. Sub-Account = your client or your SaaS end-user. Every feature described below lives at the sub-account level unless noted otherwise.

## Table of Contents

1. [CRM — Contacts & Pipelines](#01-crm--contacts--pipelines)
2. [Conversations & Unified Inbox](#02-conversations--unified-inbox)
3. [Workflows (Automation Engine)](#03-workflows-automation-engine)
4. [Calendars & Appointments](#04-calendars--appointments)
5. [Funnels, Websites & Forms](#05-funnels-websites--forms)
6. [Email Marketing](#06-email-marketing)
7. [Payments, Invoicing & Commerce](#07-payments-invoicing--commerce)
8. [Memberships, Courses & Communities](#08-memberships-courses--communities)
9. [Reporting & Analytics](#09-reporting--analytics)
10. [Agency-Level Tools](#010-agency-level-tools)
11. [Integrations, API & Webhooks](#011-integrations-api--webhooks)
12. [Settings, Users & Configuration](#012-settings-users--configuration)
13. [Mobile App & Desktop App](#013-mobile-app--desktop-app)
14. [Power Features & Lesser-Known Capabilities](#014-power-features--lesser-known-capabilities)
15. [GHL Pricing & Plan Structure](#015-ghl-pricing--plan-structure)
16. [Quick Reference: Where to Find Things](#quick-reference-where-to-find-things)

---

## 01. CRM — Contacts & Pipelines

The foundation of everything in GHL.

### 1.1 Contacts

The Contact is the atomic unit of GHL. Every lead, prospect, customer, or subscriber lives here. Each contact record stores:

- **Standard fields:** first name, last name, email, phone, address, timezone, date of birth, source
- **Custom fields:** unlimited additional fields you define — dropdowns, text, number, date, file upload, checkbox, radio, monetary
- **Tags:** free-form labels used to segment, trigger automations, and filter views
- **DND (Do Not Disturb) status per channel:** SMS, email, calls, voicemail, WhatsApp, Facebook, GMB
- **Conversation history:** every SMS, email, call, Facebook message, and WhatsApp conversation, chronologically
- **Activity log:** all automations triggered, pipeline moves, appointments, notes, and tasks
- **Appointments:** calendar bookings linked directly to the contact
- **Opportunities:** all pipeline cards associated with the contact
- **Campaigns/workflows:** membership of active automations

### 1.2 Smart Lists (Saved Filters)

Smart Lists are dynamic, saved filter views on the contact database. You define filter criteria — tag contains, custom field equals, date added is within, source is, DND status is, etc. — and GHL shows every contact matching that criteria in real time. Smart Lists are not static exports; they update automatically as contacts gain or lose tags, move through pipelines, or have fields changed.

> **USE CASE:** Create a Smart List for "Leads tagged hot-lead, not yet in pipeline, source = Facebook Ad" to give your sales team a live view of their highest-priority follow-ups.

### 1.3 Opportunities & Pipelines

Pipelines are the CRM deal-tracking layer. Each pipeline has customisable stages (columns on a Kanban board). Each Opportunity card represents a contact moving through that pipeline and stores:

- Contact (linked record)
- Pipeline stage
- Opportunity name
- Monetary value
- Assigned user
- Status: Open, Won, Lost, Abandoned
- Close date
- Custom fields at the opportunity level

You can have multiple pipelines per sub-account — for example a "New Lead" pipeline feeding into a "Sales" pipeline, or separate pipelines per service line. Automations can create, move, update, and close opportunities based on triggers anywhere in the platform.

### 1.4 Contact Scoring

Lead scoring assigns numeric points to contacts based on behaviour: visiting a page, opening an email, clicking a link, booking an appointment, filling a form. Scores accumulate and can trigger workflow branches — for example, automatically moving a contact to a "hot lead" pipeline stage once their score crosses 50 points. Scoring rules are configured at the sub-account level.

### 1.5 Bulk Actions

From any contact list view or Smart List you can select contacts in bulk and perform: add/remove tags, add to workflow, remove from workflow, send email/SMS, export to CSV, delete, change DND status, move to pipeline stage, assign to user.

---

## 02. Conversations & Unified Inbox

All channels, one thread.

### 2.1 Unified Inbox

The Conversations module is GHL's unified inbox. Every inbound and outbound message across all connected channels appears in a single threaded view per contact. Channels supported:

| Channel | Inbound | Outbound | Notes |
|---|---|---|---|
| SMS / MMS | Yes | Yes | Twilio, LC Phone, or own Twilio account |
| Email | Yes | Yes | LC Email, Mailgun, SendGrid, or SMTP |
| Phone / Calls | Yes | Yes | Click-to-call, call recording, voicemail drop |
| Facebook Messenger | Yes | Yes | Requires Facebook Page connection |
| Instagram DM | Yes | Yes | Requires Instagram Business account |
| WhatsApp | Yes | Yes | Requires WhatsApp Business API |
| Google Business (GMB) | Yes | Yes | Requires Google Business Profile |
| Live Chat Widget | Yes | Yes | Embeddable on any website |
| Webchat (AI Bot) | Yes | Yes | AI-powered chat widget |

Each conversation thread shows the full message history. From within the thread you can send a reply on any channel, make a call, schedule a message, add a note (internal, not visible to the contact), assign to a team member, change the conversation status (open/closed), add tags, and trigger a workflow.

### 2.2 AI Conversation Assistant (HighLevel AI)

GHL ships a native AI layer inside Conversations. It can:

- Suggest reply drafts based on conversation context (you click to send or edit first)
- Auto-respond to incoming messages using a configurable AI agent
- Be toggled on/off per conversation or globally per sub-account
- Use a custom knowledge base (FAQs, pricing, business info) to ground responses

The AI bot can be configured with a persona, tone, goal (book appointment, qualify lead, answer questions), and escalation rules (hand off to human if a certain intent is detected). This is the native GHL version; most sophisticated agencies build their own AI layer via the API and inject back into GHL conversations via webhooks — which is exactly what LeadSync does.

### 2.3 Phone System (LC Phone / Twilio)

GHL has a built-in telephony layer called LC Phone (powered by Twilio under the hood). Features:

- Provision local, toll-free, and international numbers directly from the platform
- Call recording with per-number on/off toggle
- Voicemail drop: pre-recorded voicemail sent without the phone ringing
- Call routing: ring multiple team members, round-robin, simultaneous ring
- IVR (Interactive Voice Response): press 1 for sales, 2 for support menus
- Call tracking: track calls from different ad sources using unique numbers
- Missed call text-back: automatically send an SMS when a call is missed
- Whisper message: play a recording to your team member before connecting a live call

### 2.4 Email System (LC Email)

LC Email is GHL's managed email sending infrastructure. It handles deliverability configuration (DKIM, DMARC, SPF) for connected domains. Sub-accounts can also connect their own Mailgun, SendGrid, or any SMTP provider. The platform tracks opens, clicks, bounces, and unsubscribes per email sent, whether via one-to-one conversations, bulk broadcasts, or automated workflows.

### 2.5 Reviews & Reputation Management

GHL can automatically request reviews from contacts via SMS or email after a trigger (appointment completed, payment received, tag added). Review requests link to Google or Facebook. Incoming reviews from Google Business Profile appear in the Reputation tab, and you can respond to them directly from GHL. A reputation score and review count are tracked per sub-account.

---

## 03. Workflows (Automation Engine)

The most powerful module in the platform.

### 3.1 What Is a Workflow?

Workflows are GHL's automation engine. A Workflow has a Trigger (what starts it) and a sequence of Actions (what happens). Workflows can branch with conditional logic, loop, wait for time or events, and communicate with external systems via webhooks. Everything in GHL that can be automated lives inside a Workflow.

### 3.2 Triggers

A workflow can be started by any of the following:

- Contact Created
- Contact Tag Added / Removed
- Contact DND Status Changed
- Contact Changed
- Appointment Status Changed (confirmed, cancelled, showed, no-showed, reschedule requested)
- Form Submitted (specific form or any form)
- Survey Submitted
- Order Form Submitted / Sale Made / Subscription Started / Subscription Cancelled / Payment Failed
- Funnel / Page Visited
- Email Event: Opened, Clicked, Bounced, Complained, Unsubscribed
- SMS Replied
- Facebook / Instagram / GMB Message Received
- WhatsApp Message Received
- Call Status Changed (completed, missed, voicemail)
- Pipeline Stage Changed
- Opportunity Status Changed (won, lost, abandoned)
- Invoice Status Changed
- Membership / Course: Access Granted, Progress Updated, Lesson Completed
- Contact Score Changed
- Custom Date Reminder (e.g. X days before a custom date field)
- Birthday Reminder
- Inbound Webhook (external system posts data in)
- Manual: triggered by a team member from within a contact record

### 3.3 Actions (the full list)

Once a workflow is triggered, you can chain any number of actions:

**Communication actions**
- Send Email (use saved template or compose inline, with dynamic merge fields)
- Send SMS (same)
- Send WhatsApp Message
- Send Facebook Messenger Message
- Send Instagram DM
- Send GMB Message
- Send Voicemail Drop
- Make Call (auto-dial a contact)
- Internal Notification (email or SMS to a team member or custom email address)

**CRM actions**
- Add/Remove Tag
- Create Contact
- Update Contact Field (any standard or custom field)
- Add to/Remove from Smart List
- Create Opportunity
- Update Opportunity
- Move Opportunity Stage
- Change Opportunity Status (won / lost / abandoned)
- Assign to User
- Create Task
- Create Note
- Add/Remove from DNDs

**Appointment actions**
- Create Appointment (auto-book into a calendar)
- Update Appointment Status

**Flow control actions**
- Wait (for a defined duration, or until a specific date/time, or until an event occurs)
- Wait for Contact Reply (pauses until the contact sends a message, with a timeout fallback)
- If/Else (branch based on any field, tag, event, or condition)
- Go To (jump to another step in the same workflow)
- End Workflow
- Goal (marks a milestone; workflow advances enrolled contacts immediately when they reach the goal from any earlier step)

**Integration actions**
- Send Webhook (POST/GET to any external URL with full payload control — the bridge to your own backend)
- Set Contact Score
- Send Review Request

**Financial actions**
- Create Invoice
- Send Invoice
- Issue Refund

**AI / GPT actions**
- AI Text (generate a custom AI-written message based on a prompt and contact data)
- AI Voice (generate and send an AI voice message)
- GHL AI Bot Step (enable/disable the AI conversation responder for a specific contact)

### 3.4 Conditional Logic (If/Else Branching)

The If/Else action is what makes workflows truly powerful. You can branch on virtually any condition:

- Contact field value equals / contains / is greater than / is empty
- Contact has tag / does not have tag
- Opportunity stage, status, or value
- Appointment status
- Email opened / not opened / clicked
- Time of day / day of week
- Custom webhook data received
- Number of times in workflow

Branches can be chained (If/Else inside If/Else) for complex decision trees. Each branch is a separate action sequence.

### 3.5 Workflow Settings

- **Allow Re-entry:** whether a contact already in the workflow can be re-enrolled
- **Stop on Response:** pause and stop sending if the contact replies (critical for conversational workflows)
- **Enrollment conditions:** run all contacts matching a filter immediately, or only new triggers going forward
- **Draft / Published status:** test before going live

---

## 04. Calendars & Appointments

End-to-end scheduling.

### 4.1 Calendar Types

| Calendar Type | Use Case | Key Behaviour |
|---|---|---|
| Simple (Round Robin) | Team scheduling | Assigns to available team member in rotation |
| Simple (Collective) | All-hands meetings | Only shows slots when ALL selected members are free |
| Class Booking | Group sessions | Multiple people book the same single time slot |
| Service Calendar | Service businesses | Resource + team member availability combined |
| Event Calendar | Ticketed events | Fixed date/time, limited seats, ticket-like booking |
| Personal Calendar | Individual booking links | One owner, one availability schedule |

### 4.2 Calendar Configuration

Each calendar has deep configuration options:

- **Availability windows:** days of week, time ranges per day, with break times
- **Buffer times:** gap before and/or after each appointment
- **Lead time:** minimum notice required before a booking (e.g. 1 hour)
- **Date range:** how far into the future a contact can book
- **Appointment duration**
- **Custom appointment titles** using dynamic merge fields
- **Confirmation page:** redirect URL or inline GHL thank-you page
- **Google Calendar / Outlook sync:** two-way sync so personal calendar blocks show as unavailable
- **Zoom / Google Meet integration:** auto-generate unique meeting links per booking
- **Custom intake form questions** shown on the booking widget
- **Payment required to book:** integrate with Stripe to take a deposit or full payment at booking

### 4.3 Appointment Confirmations & Reminders

Each calendar has built-in notification settings for confirmation, reminder, and follow-up messages, configurable per channel (email/SMS). These can also be fully replaced with Workflow automations for more complex logic (send reminder 24 hours before, then 1 hour before, then follow-up 30 minutes after the appointment ends).

### 4.4 Appointment Management

The Appointments view shows all bookings in a calendar or list view. Staff can manually create, reschedule, or cancel appointments. Each appointment record links back to the contact, shows all booking form answers, and logs the full history of status changes. Appointment status changes (no-show, confirmed, cancelled) can trigger Workflows.

---

## 05. Funnels, Websites & Forms

The front door for every lead.

### 5.1 Funnel Builder vs Website Builder

GHL provides two page-building tools with almost identical editors but different structural purposes:

- **Funnels:** linear sequences of pages (Step 1 opt-in, Step 2 thank you, Step 3 upsell). Traffic flows forward through steps. Designed for conversion-focused flows.
- **Websites:** full multi-page sites with navigation. Better for service pages, blogs, and brochure sites. Each page is independent, linked via navigation menus.

Both use the same drag-and-drop editor with sections, rows, columns, and elements.

### 5.2 Page Editor Elements

The editor supports:

- Text blocks (with rich text, custom HTML)
- Images and videos
- Buttons (with link, trigger, or popup actions)
- Forms (native GHL forms embedded inline)
- Surveys
- Calendars (book directly on the page)
- Countdown timers
- Progress bars
- Testimonials
- Pricing / plan cards
- Membership content
- Custom code blocks (HTML/CSS/JS)
- Chat widgets
- Columns (up to 6-column grids)

### 5.3 Forms

Forms are standalone or embedded. Each form:

- Maps fields to contact standard or custom fields
- Can be embedded on funnels, websites, or third-party sites via embed code
- Triggers a Workflow on submission
- Supports conditional field display (show/hide fields based on answers)
- Supports multi-step form layouts
- Stores all submissions in a Submissions view
- Can require a CAPTCHA
- Can auto-populate fields from URL parameters (for ad tracking)

### 5.4 Surveys

Surveys are extended forms with a one-question-per-screen format, ideal for onboarding or qualification flows. They support the same field types as forms, plus sliders and picture-choice options. Survey answers map to contact fields and are stored as submissions.

### 5.5 Order Forms & Upsells

Funnel pages can contain order forms connected to GHL's payment system. Order forms support:

- One-time payments
- Subscriptions (with free/paid trial periods)
- Bump offers (checkbox add-ons at checkout)
- One-click upsells and downsells on subsequent funnel pages (card on file from initial purchase)
- Coupon codes

### 5.6 Popups

Funnels and websites support lightbox popups that can contain any page elements, including forms and calendars. Trigger conditions: on page load after X seconds, on exit intent, on button click, or on scroll percentage.

---

## 06. Email Marketing

Broadcasts, templates, and campaigns.

### 6.1 Email Campaigns (Broadcasts)

The Email Marketing module handles bulk one-to-many email sends, separate from the one-to-one conversation system. A campaign is configured with:

- From name and email address
- Subject line and preview text
- Email body (drag-and-drop template builder or HTML)
- Recipient list: based on Smart Lists, tags, or a manual contact selection
- Schedule: send now or at a specific date/time
- Timezone-aware sending: send at X time in each recipient's local timezone

### 6.2 Email Templates

Templates are reusable email designs. The template builder is a drag-and-drop editor with:

- Layout blocks (1-column, 2-column, etc.)
- Image blocks
- Button blocks
- Social link blocks
- Dividers and spacers
- Merge fields for personalisation: `{{contact.first_name}}`, `{{contact.email}}`, custom fields
- Unsubscribe link (required; auto-injected if missing)

Templates are shared between the Email Marketing module and Workflow email actions.

### 6.3 Email Statistics

For every campaign or workflow email, GHL tracks: sent, delivered, opened (unique and total), clicked (unique and total), bounced (hard and soft), complained (spam reports), unsubscribed. Contact-level tracking allows you to see exactly which contacts opened or clicked, and trigger Workflows based on those events.

---

## 07. Payments, Invoicing & Commerce

From one-off invoices to full e-commerce.

### 7.1 Payment Integrations

GHL connects to:

- **Stripe:** the primary and most deeply integrated processor — used for one-time, subscriptions, and saved cards for upsells
- **PayPal:** available for order forms
- **Square:** available for in-person and online
- **NMI (Network Merchants Inc):** for agencies needing custom card processors
- **Authorize.net**

Payment accounts are configured per sub-account or inherited from agency level.

### 7.2 Products & Catalogue

The Products module is a product catalogue. Each product has a name, description, image, and one or more price points (one-time, recurring subscription, or pay-what-you-want). Products are linked to order forms and the store builder. Product purchases trigger Workflows.

### 7.3 Invoices

GHL has a standalone Invoicing module. Features:

- Create one-off or recurring invoices
- Line items with quantity, unit price, tax rate
- Due date and payment terms
- Send via email with a pay-by-link (Stripe hosted page or GHL payment page)
- Partial payments and deposits
- Invoice status: Draft, Sent, Partially Paid, Paid, Overdue, Void
- Auto-reminder sequences for overdue invoices
- Invoice triggers Workflows on status changes

### 7.4 Estimates / Proposals

GHL can generate and send estimates (similar to invoices but requiring client acceptance). When accepted, an estimate converts to an invoice. Useful for service businesses that need client sign-off before billing.

### 7.5 Subscriptions

Subscriptions created via order forms or invoices appear in a Subscriptions view. You can see active, cancelled, and paused subscriptions per contact, with the ability to cancel or update them manually or via Workflow action.

### 7.6 Store Builder (E-Commerce)

The Store Builder adds full e-commerce capabilities: product catalogue pages, cart, checkout, order management, shipping rules, discount codes, and tax configurations. It is a separate module from funnels and is intended for businesses selling physical or digital products at volume. Orders sync to contacts and trigger Workflows.

---

## 08. Memberships, Courses & Communities

Digital products and gated content.

### 8.1 Memberships

The Memberships module allows sub-accounts to host online courses and gated content portals. Structure:

- **Product** (the top-level container, e.g. "12-Week Coaching Programme")
- **Modules** (chapters or sections)
- **Lessons** (individual content pages with video, text, audio, PDFs, quizzes)
- **Offers** (pricing tiers that grant access to specific products, linking to payment)

Access can be drip-fed: set lessons or modules to unlock X days after enrolment rather than releasing all at once.

### 8.2 Communities

Communities is GHL's Facebook Groups replacement. Members can post, comment, react, and join topic-based sub-groups within a community. Access is granted via membership offers or manually. Community activity can trigger Workflows. The feature includes a live streaming module and basic notification system.

### 8.3 Client Portal

Each sub-account can enable a Client Portal: a white-labelled web portal where contacts log in to access their purchased courses, communities, invoices, and documents. It uses the sub-account's domain and branding.

---

## 09. Reporting & Analytics

Data across every module.

### 9.1 Dashboard

The GHL Dashboard is a configurable widget-based view. Each sub-account can have multiple dashboards. Available widgets include:

- Total contacts, new contacts (date range filter)
- Opportunities by pipeline stage (funnel chart)
- Appointments: booked, confirmed, cancelled, no-show
- Revenue: total, by period, by product
- Conversation statistics: total sent, total received, per channel
- Email campaign performance
- Pipeline value (open, won, lost)
- Task completion stats
- Custom report widgets

### 9.2 Attribution & Source Tracking

GHL tracks the source of every contact through UTM parameters. When a contact fills a form or books from a page with UTM tags in the URL, GHL captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` as contact fields. This allows pipeline and revenue reporting sliced by ad source.

### 9.3 Call Reporting

The Calls report shows all inbound and outbound calls, duration, recording links, call status, and which team member handled each call. Filter by date range, team member, or number.

### 9.4 Booking Report

Shows all appointments across all calendars with booking rate (shown vs. booked), no-show rate, cancellation rate, and revenue from paid bookings.

### 9.5 Agent / Team Reporting

For agencies with multiple team members, GHL tracks which user sent messages, made calls, created opportunities, and closed deals. Leaderboard and individual performance views are available.

---

## 010. Agency-Level Tools

Managing clients and reselling GHL.

### 10.1 Sub-Account Management

The Agency view gives you a bird's-eye dashboard over all sub-accounts. From here you can:

- Create, archive, and delete sub-accounts
- Switch into any sub-account without a separate login
- View aggregate stats across all sub-accounts
- Set up agency-wide SaaS pricing plans
- Configure which features each plan unlocks for sub-accounts

### 10.2 Snapshots

Snapshots are GHL's templating system at the agency level. A Snapshot captures everything configured inside a sub-account: workflows, funnels, websites, pipelines, calendars, forms, email templates, tags, custom fields, and dashboard configs. You can push a Snapshot to any number of sub-accounts, instantly deploying a pre-built configuration. Snapshots are:

- Shareable via link (other agencies can import your Snapshot)
- Updatable: push updates from a master sub-account to all sub-accounts that received the Snapshot
- The foundation of any productised agency service or SaaS offer on GHL

> **FOR LEADSYNC:** Your pre-configured AI lead qualification setup would ideally be delivered as a Snapshot to each new client sub-account.

### 10.3 White-Label Configuration

The Agency plan allows full white-labelling:

- Custom domain for the platform (your clients log in at `app.youragency.com`, not `app.gohighlevel.com`)
- Custom logo and colours
- Custom email sending domain for system emails (notifications, confirmations)
- White-label desktop app (packaged as a Mac or Windows app with your branding)
- White-label mobile app: submit to App Store and Play Store under your brand (SaaS Pro plan)
- Agency phone number for support

### 10.4 SaaS Mode

SaaS Mode is the mechanism for reselling GHL as your own product. You configure:

- Pricing plans (with Stripe): monthly/annual options
- Feature access per plan (which modules, how many contacts, seats, etc.)
- Trial period
- Upgrade/downgrade flows
- Auto-billing and dunning

When a prospect signs up via your SaaS funnel, a sub-account is automatically created, the Snapshot is applied, and the subscription is started. This is the foundation of any GHL-based SaaS business.

### 10.5 Reselling LC Phone & LC Email

Agencies can resell GHL's communication services at a markup. You pay wholesale rates for SMS and email sending via LC Phone and LC Email; you set the retail rate your clients pay. Billing flows through your agency account, with per-sub-account usage tracked. Margin is typically 100–400% on the wholesale rate.

### 10.6 Agency Reporting

The Agency dashboard shows aggregate MRR (if using SaaS mode), total sub-accounts, active vs. inactive, and recent activity. Useful for spotting which clients are not using the platform (churn risk) and which are the most active.

---

## 011. Integrations, API & Webhooks

Connecting GHL to your stack.

### 11.1 Native Integrations

| Category | Integrations |
|---|---|
| Calendar sync | Google Calendar, Outlook / Office 365 |
| Video conferencing | Zoom, Google Meet |
| Advertising | Facebook Ads (lead form sync), Google Ads (conversion events) |
| Social media | Facebook, Instagram, LinkedIn, Twitter/X, TikTok, Google My Business |
| CRM / database | Salesforce (bidirectional sync) |
| Email sending | Mailgun, SendGrid, SMTP, LC Email |
| SMS | Twilio, LC Phone |
| Chat | WhatsApp Business API, Facebook Messenger |
| Payments | Stripe, PayPal, Square, NMI, Authorize.net |
| Shipping | EasyPost (for store) |
| Document signing | DocuSign (native e-signature in proposals) |
| Zapier / Make | Bidirectional via Zap / scenario triggers and actions |

### 11.2 The GHL Public API

GHL exposes a REST API at `https://services.leadconnectorhq.com/` (the underlying domain behind GHL). The API is OAuth 2.0 authenticated with JWT access tokens. Key capabilities:

- **Contacts:** CRUD, tag management, field updates, bulk import/export
- **Conversations:** create, read, update; send messages on any channel programmatically
- **Opportunities:** CRUD, stage updates
- **Calendars:** list availability, create/update/cancel appointments
- **Forms:** list forms, retrieve submissions
- **Workflows:** add or remove contacts from workflows
- **Sub-accounts:** create, update, list (agency-level only)
- **Locations (sub-accounts):** full metadata, settings, connected integrations
- **Payments:** orders, subscriptions, invoices
- **Custom fields:** create and manage custom field definitions
- **Campaigns:** list and manage email campaigns

The API is rate limited (varies by endpoint; typically 100 requests/10 seconds per sub-account). All calls require a Location ID (sub-account identifier) in the header for sub-account-scoped endpoints.

> **FOR LEADSYNC:** LeadSync communicates with GHL primarily via the API to create contacts, send messages via conversations, update fields, add tags, and book appointments — all the core actions of the AI qualification flow.

### 11.3 Webhooks (Outbound from GHL)

GHL can fire webhooks to any external URL on virtually every platform event. This is configured at the sub-account level (Settings > Integrations > Webhooks) or via the Send Webhook Workflow action. Webhook events:

- Contact Created / Updated / Deleted / Tag Change / DND Change
- Conversation Message Sent / Received (per channel)
- Opportunity Created / Updated / Stage Changed / Status Changed
- Appointment Created / Updated / Deleted / Status Changed
- Form / Survey Submitted
- Order / Payment Received
- Call Started / Ended

Each webhook fires a JSON payload with the full event data. Your backend receives it, processes it, and can call back to GHL via the API.

### 11.4 OAuth App Marketplace

Developers can build and publish GHL Marketplace Apps that other agencies and sub-accounts can install. A Marketplace App uses OAuth 2.0 to obtain authorised access to a sub-account on behalf of the GHL user. GHL hosts the app directory and handles the install flow. Apps can request specific OAuth scopes (which data/actions they can access), and GHL reviews them before approval. This is the channel used by LeadSync to connect to client sub-accounts without requiring manual API key sharing.

### 11.5 Zapier & Make (Integromat)

GHL has a certified Zapier integration and a Make (Integromat) app. These provide no-code connectivity to 3,000+ apps. Common use cases: sync Facebook Lead Ads to GHL contacts, push GHL form submissions to Google Sheets, create GHL contacts from Typeform responses, send Slack notifications on new opportunities. For teams not building custom API integrations, Zapier/Make covers the majority of integration needs.

---

## 012. Settings, Users & Configuration

The control room.

### 12.1 Users & Team Members

Each sub-account supports multiple users. User roles:

| Role | Access Level |
|---|---|
| Admin | Full access to all sub-account settings and features |
| User | Access configured by admin; can be scoped to specific pipelines, calendars, or tabs |
| Agency Admin | Full agency-level access plus all sub-accounts |
| Agency View-Only | Read-only access to agency dashboard |

Users can be assigned to specific calendars (so they only appear as available on those booking links), specific pipelines (so they only see their own opportunities), and specific notification channels.

### 12.2 Custom Fields

Custom fields extend the contact and opportunity data model. Field types:

- Text (single line, multi-line)
- Number
- Phone
- Dropdown (single select)
- Checkbox (multi-select)
- Radio (single select, different UI from dropdown)
- Date / Date+Time
- File Upload
- Monetary
- Signature

Custom fields can be organised into folders. They are available as merge fields in emails, SMS, and workflow logic, as filter criteria in Smart Lists, and as visible columns in the contact list view.

### 12.3 Custom Values (Agency Defaults)

Custom Values are key-value pairs stored at the sub-account level (or inherited from agency defaults). They function like global variables — store a value once and reference it with `{{custom_values.key_name}}` in any email, SMS, funnel, or workflow. Common uses: business name, support phone number, booking link URL, brand colours for templates. Agency-level Custom Values cascade down to all sub-accounts and can be overridden per sub-account.

### 12.4 Domain & Hosting Settings

Each sub-account connects its own domain(s) for:

- Funnel and website hosting (point a CNAME to GHL's CDN)
- Email sending authentication (add DKIM, SPF, DMARC DNS records for LC Email or Mailgun)
- The Client Portal
- The Membership Portal
- The API redirect URI (for OAuth apps)

### 12.5 Business Info & Compliance

Settings include: business name, address, timezone, logo, and business category (used by the phone system and email compliance). GHL enforces CAN-SPAM and TCPA compliance features: every email must include an unsubscribe link; SMS messages include required opt-out language; DND lists are respected automatically.

### 12.6 Audit Logs

GHL logs all significant user actions at the sub-account level: who created or updated a contact, who changed a pipeline stage, who deleted a record, who changed workflow settings. Audit logs are viewable in Settings and are useful for debugging automation issues and for accountability in multi-user environments.

---

## 013. Mobile App & Desktop App

On the go.

GHL ships a mobile app (iOS and Android) called the "HighLevel" app (or whatever white-label name you set). It provides:

- **Conversations:** send/receive messages on all channels
- **Contacts:** view and edit contact records
- **Opportunities:** view and update pipeline cards
- **Appointments:** view and manage bookings
- **Calling:** make and receive calls via the GHL phone system
- **Push notifications:** for new messages, missed calls, and workflow alerts

The mobile app is functional but less featured than the web platform. It is most useful for sales reps who need to respond to leads on the go and for business owners who want a quick view of their pipeline.

The white-label desktop app wraps the GHL web platform in an Electron shell for Mac and Windows, providing a native-feeling application experience under your agency branding.

---

## 014. Power Features & Lesser-Known Capabilities

What separates average GHL users from experts.

### 14.1 Conditional Smart Lists as Workflow Enrollers

You can configure a Workflow to enrol all existing contacts matching a Smart List filter when the workflow is first published, not just new triggers going forward. Combined with the re-entry settings, this lets you retroactively add thousands of existing contacts into a nurture sequence in seconds.

### 14.2 Goal Events in Workflows

The Goal action is underused. When a contact reaches a Goal step in a workflow, any other contact already enrolled in an earlier step of the same workflow who meets the Goal condition is automatically advanced to the Goal — skipping all steps in between. This means if someone books an appointment (Goal: appointment booked), all the follow-up reminder messages that haven't fired yet are cancelled automatically.

### 14.3 Number Pools for Call Tracking

For multi-source ad tracking, GHL supports number pools: provision multiple tracking numbers, each associated with a different UTM source. Visitors from different ad channels see different phone numbers on your website, allowing attribution of phone call conversions to specific campaigns — without any Zapier or third-party call tracking tool.

### 14.4 Email Footer Management

GHL allows agencies to configure a global email footer (with unsubscribe and physical address) at the agency level that cascades to all sub-accounts. Sub-accounts can customise theirs. This is critical for CAN-SPAM compliance and for maintaining a consistent brand across all automated emails.

### 14.5 Inline Editing on Funnels via Funnel AI

GHL has added an AI Funnel Builder that can generate a complete funnel (with copy, sections, and design) from a text prompt. The generated funnel is fully editable. It is a starting point accelerator, not a production-ready output, but it can cut funnel creation time significantly for agencies building at scale.

### 14.6 Split Testing

Funnel pages support A/B split testing. You create two variants of a page; GHL splits traffic between them (configurable percentage) and tracks conversion rates per variant. Useful for optimising opt-in rates on landing pages.

### 14.7 Conversation AI Bots with Trained Knowledge

Beyond the basic AI reply suggestions, GHL allows you to train a bot with custom Q&A pairs and document uploads (PDFs, URLs). The bot uses this knowledge base to answer questions accurately before falling back to general AI. Intent detection can be configured so the bot escalates to a human if it detects purchase intent, complaints, or other specified intents.

### 14.8 WhatsApp Templates (HSM)

Sending the first message to a WhatsApp contact requires a pre-approved template (Highly Structured Message). GHL manages WhatsApp template submission and approval directly within the platform. Once templates are approved by Meta, they can be used in Workflows for outbound WhatsApp notifications (appointment reminders, payment receipts, etc.) without any third-party WhatsApp gateway needed.

---

## 015. GHL Pricing & Plan Structure

What you pay and what you get.

| Plan | Price (USD/mo) | Sub-Accounts | Key Inclusions |
|---|---|---|---|
| Starter | $97 | 1 client location | Core CRM, funnels, workflows, calendars, email, SMS |
| Unlimited / Pro | $297 | Unlimited | Everything + API access, white-label, Snapshots, SaaS mode (limited) |
| SaaS Pro | $497 | Unlimited | Full white-label mobile app, SaaS reselling, priority support |

All plans include unlimited contacts, unlimited users, and unlimited workflows. Usage-based costs (SMS, email, calls) are billed separately via LC Phone/LC Email or your own Twilio/Mailgun account. AI features (GHL AI Bot, AI reply suggestions) may have separate per-conversation costs.

---

## Quick Reference: Where to Find Things

| If you want to... | Go to... |
|---|---|
| See all your leads and contacts | Contacts |
| Track deals through a sales process | Opportunities > [Pipeline Name] |
| Send a one-to-one message or reply | Conversations |
| Build an automated follow-up sequence | Automation > Workflows |
| Create a landing page or opt-in page | Sites > Funnels or Websites |
| Build an intake or lead capture form | Sites > Forms |
| Set up a booking page | Calendars > Manage > Booking Widget |
| Send a bulk email to a list | Email Marketing > Campaigns |
| Create and send an invoice | Payments > Invoices |
| Set up a course or membership | Memberships |
| Connect a third-party tool via webhook | Settings > Integrations > Webhooks, or Send Webhook in Workflow |
| Push a pre-built setup to a client | Agency View > Snapshots |
| Check platform performance | Reporting > Overview |
| Configure the AI chat bot | Conversations > AI Bot Settings, or Automation > Workflows > Bot Node |

---

This document covers GHL as of mid-2025 / early 2026. GHL releases updates rapidly; verify current feature availability in the GHL changelog at https://ideas.gohighlevel.com.
