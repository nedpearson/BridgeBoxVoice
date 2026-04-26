/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  PAGE AGENT v6 — Full Retail Boutique Data Engine        ║
 * ║  Cost price, retail price, margins, payment terms        ║
 * ║  Vendor management, layaway, commissions, POS            ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'
import { buildPageFromData, type PageData } from './pageTemplate'

// ── Retail-specific data generation prompt ────────────────────────────────────
const DATA_SYSTEM = `You are a retail boutique business data expert.
Output ONLY valid JSON matching this schema. Generate REAL, specific values — never use placeholders.

{
  "fields": [...column keys, camelCase, 4-7 items, always include 'id' and a primary name field],
  "records": [...7-9 records with all field keys and realistic retail boutique values],
  "stats": [...exactly 4 stat objects { "label": string, "value": string|number } — SPECIFIC to this page, never repeat across pages],
  "formFields": [...4-7 form field objects { "key": string, "label": string, "type": "text"|"date"|"select"|"textarea"|"number", "options"?: string[] }],
  "subRecords": [...8-12 child records { "id": number, "parentId": number (matches a record id), "title": string, "date": "YYYY-MM-DD", "status": string }]
}

RETAIL PRICING RULES (apply to any inventory, order, or sales page):
- Include BOTH "costPrice" (what boutique paid) AND "retailPrice" (what customer pays) as separate fields
- Add "margin" field showing profit margin % (e.g. "42%")
- Payment terms options: ["Net 30", "Net 60", "Net 90", "COD", "CIA", "2/10 Net 30", "Consignment"]
- Layaway fields when relevant: layawayBalance, depositAmount, nextPaymentDate, termsMonths

DOMAIN RULES:
- All dollar amounts must be formatted as "$X,XXX" strings
- Status options should be boutique-specific (NOT just Active/Pending/Complete)
- Use real designer brand names (Maggie Sottero, Essense of Australia, Justin Alexander, etc.)
- Use real boutique location names matching the business
- Sub-records should describe real business activity with specific dollar amounts or quantities
- NEVER use "Record A", "Item 1", or generic placeholders
- Return ONLY JSON. No markdown. No explanation.`

// ── Full retail boutique page-type hints ──────────────────────────────────────
function getPageTypeHint(pageName: string): string {
  const n = pageName.toLowerCase()

  if (n.includes('appointment') || n.includes('booking')) {
    return `Fields: id, brideName, appointmentType (Bridal/Bridesmaid/MOB/Prom/Vow Renewal), stylist, location, appointmentDate, status (Confirmed/Pending/No-Show/Cancelled/Walk-In).
Stats: Total This Month, This Week's Count, No-Show Rate (%), Revenue from Consultations.
FormFields: Bride Name, Phone, Email, Appointment Type (select), Preferred Stylist, Location (select), Date, Party Size (number), Notes (textarea).
SubRecords: Try-on logged, Gown reserved, Follow-up call completed, Deposit collected ($XXX), Alteration quote given, Referral noted.`
  }

  if (n.includes('customer') || n.includes('bride') || n.includes('client')) {
    return `Fields: id, brideName, phone, email, weddingDate, location, totalSpent, accountStatus (Active/Layaway/Paid-in-Full/Delinquent).
Stats: Total Clients, Active Layaways, Revenue This Month ($), Avg Transaction Value ($).
FormFields: Bride Name, Phone, Email, Wedding Date, Location (select), Account Type (select: Cash/Layaway/Terms), Credit Limit ($), Notes (textarea).
SubRecords: Appointment attended, Gown purchased ($X,XXX retail / $X,XXX cost), Layaway payment received ($XXX), Alteration completed ($XXX), Balance due reminder sent, Referral given (name).`
  }

  if (n.includes('inventory') || n.includes('gown') || n.includes('dress') || n.includes('product') || n.includes('merchandise')) {
    return `Fields: id, styleNumber, gownName, designer, size, costPrice ($X,XXX), retailPrice ($X,XXX), margin (%), status (Floor Sample/Reserved/Sold/In Alteration/On Order/Consignment).
Stats: Total SKUs, Floor Samples Available, Total Retail Value ($), Total Cost Basis ($).
FormFields: Style Number, Gown Name, Designer (select: Maggie Sottero/Essense of Australia/Justin Alexander/Rebecca Ingram/Stella York), Size, Cost Price ($, number), Retail Price ($, number), Color, Silhouette (select: A-Line/Ball Gown/Mermaid/Sheath/Trumpet), Notes (textarea).
SubRecords: Reserved by bride (name, date), Try-on logged, Price adjusted (from $X to $Y), Alteration order started, Sold - invoice #XXXX, Returned to vendor.`
  }

  if (n.includes('alteration') || n.includes('tailoring') || n.includes('sewing')) {
    return `Fields: id, brideName, gownStyle, alterationType (Hem/Bustle/Taken In/Let Out/Zipper/Beading/Custom), tailor, costToShop ($XXX), chargeToCustomer ($XXX), dueDate, status (Pending/In Progress/Ready/Delivered/Overdue).
Stats: Open Alterations, Due This Week, Revenue This Month ($), Avg Alteration Value ($).
FormFields: Bride Name, Gown Style, Alteration Type (select), Assigned Tailor (select), Due Date, Shop Cost ($, number), Customer Charge ($, number), Rush Fee ($), Notes (textarea).
SubRecords: Measurements recorded, First fitting scheduled, Second fitting completed, Customer approved, Balance collected ($XXX), Picked up by bride.`
  }

  if (n.includes('pickup') || n.includes('delivery')) {
    return `Fields: id, brideName, gownStyle, invoiceNumber, scheduledDate, location, assignedTo, balanceDue ($), status (Scheduled/Completed/Rescheduled/No-Show).
Stats: Pickups This Week, Completed Today, Outstanding Balances ($), Average Balance at Pickup ($).
FormFields: Bride Name, Invoice Number, Gown Style, Location (select), Scheduled Date, Assigned Staff, Balance Due ($, number), Payment Method (select: Cash/Credit Card/Check/Zelle/Venmo), Notes (textarea).
SubRecords: Confirmation call made, Balance collected ($XXX), ID verified, Gown inspected, Receipt issued, Alteration bag packed.`
  }

  if (n.includes('employee') || n.includes('staff') || n.includes('team')) {
    return `Fields: id, employeeName, role (Owner/Manager/Senior Stylist/Stylist/Tailor/Receptionist), location, hourlyRate ($), commissionRate (%), status (Full-Time/Part-Time/Seasonal/On-Leave).
Stats: Total Staff, Stylists on Floor, Monthly Payroll ($), Avg Commission Earned ($).
FormFields: Full Name, Role (select), Location (select), Hire Date, Hourly Rate ($, number), Commission Rate (%, number), SSN Last 4, Emergency Contact, Notes (textarea).
SubRecords: Commission earned on sale ($XXX - gown name), Shift worked (X hrs), Performance review completed, Training completed, Bonus issued ($XXX), Schedule change requested.`
  }

  if (n.includes('schedule') || n.includes('calendar') || n.includes('shift')) {
    return `Fields: id, employeeName, location, shiftDate, startTime, endTime, hoursScheduled, role, status (Scheduled/Worked/Called-Out/Swapped).
Stats: Staff Scheduled This Week, Open Shifts, Total Hours This Week, Overtime Hours.
FormFields: Employee (select), Location (select), Date, Start Time, End Time, Role (select), Notes (textarea).
SubRecords: Clock-in recorded, Clock-out recorded, Break taken, Shift swapped with (name), Manager approved, Overtime flagged.`
  }

  if (n.includes('payroll') || n.includes('commission') || n.includes('compensation')) {
    return `Fields: id, employeeName, role, payPeriod, hoursWorked, hourlyRate ($), basePay ($), commissionsEarned ($), totalGross ($), status (Pending/Processed/Paid/On-Hold).
Stats: Total Payroll This Period ($), Commissions Paid ($), Employees Processed, Avg Check Amount ($).
FormFields: Employee (select), Pay Period Start, Pay Period End, Hours Worked (number), Hourly Rate ($, number), Commission Sales ($, number), Commission Rate (%, number), Deductions ($, number), Notes (textarea).
SubRecords: Direct deposit initiated, Commission on sale - (gown, $XXX), Overtime calculated (+$XXX), Deduction applied ($XXX), W2 generated, Pay stub emailed.`
  }

  if (n.includes('vendor') || n.includes('supplier') || n.includes('brand')) {
    return `Fields: id, vendorName, brand, accountRep, phone, paymentTerms (Net 30/Net 60/COD/CIA/2-10 Net 30), creditLimit ($), outstandingBalance ($), status (Active/On-Hold/Inactive/New).
Stats: Active Vendors, Total Payables ($), Orders This Month, Overdue Invoices.
FormFields: Vendor Name, Brand, Account Rep Name, Phone, Email, Payment Terms (select: Net 30/Net 60/Net 90/COD/CIA/Consignment), Credit Limit ($, number), Territory/Region, Notes (textarea).
SubRecords: Order placed (PO#XXXX, $X,XXX), Invoice received ($X,XXX), Payment made ($X,XXX, check #XXXX), Return processed ($XXX credit), Rep visit logged, New styles previewed.`
  }

  if (n.includes('purchase') || n.includes('order') || n.includes('po ') || n === 'orders') {
    return `Fields: id, poNumber, vendorName, orderDate, expectedDelivery, totalCost ($), totalRetail ($), projectedMargin (%), status (Draft/Submitted/Confirmed/In-Transit/Received/Partially-Received/Cancelled).
Stats: Open POs, Expected This Month ($), Total On-Order Cost ($), Projected Retail Value ($).
FormFields: Vendor (select), PO Date, Expected Delivery, Payment Terms (select: Net 30/Net 60/COD), Ship-To Location (select), Shipping Method, Notes (textarea).
SubRecords: Line item: style# gown ($XXX cost / $XXX retail, qty X), Vendor confirmed, Shipment tracking added, Partial receipt logged (X of Y units), Invoice matched, Payment scheduled.`
  }

  if (n.includes('invoice') || n.includes('payment') || n.includes('receivable') || n.includes('billing')) {
    return `Fields: id, invoiceNumber, brideName, invoiceDate, subtotal ($), tax ($), totalDue ($), amountPaid ($), balance ($), paymentTerms, status (Draft/Sent/Partial/Paid/Overdue/Void).
Stats: Total Outstanding ($), Collected This Month ($), Overdue Invoices, Avg Days to Pay.
FormFields: Bride Name (select), Invoice Date, Due Date, Payment Terms (select: Due on Receipt/Net 7/Net 15/Net 30/Layaway), Line Item Description, Amount ($, number), Tax Rate (%, number), Discount ($, number), Notes (textarea).
SubRecords: Deposit collected ($XXX, method), Installment payment ($XXX, date), Final balance paid, Receipt emailed, Refund issued ($XXX), Collections note added.`
  }

  if (n.includes('layaway') || n.includes('installment') || n.includes('finance')) {
    return `Fields: id, brideName, gownStyle, retailPrice ($), depositPaid ($), balance ($), nextPaymentDate, monthsRemaining, paymentSchedule (Monthly/Bi-Weekly/Custom), status (Current/Late/Paid-Off/Defaulted/Cancelled).
Stats: Active Layaways, Collected This Month ($), Total Layaway Balance ($), Defaulted Accounts.
FormFields: Bride Name (select), Gown Style (select), Retail Price ($, number), Initial Deposit ($, number), Payment Frequency (select: Monthly/Bi-Weekly/Weekly), Term Length (select: 3/6/9/12 months), Notes (textarea).
SubRecords: Deposit received ($XXX), Monthly payment received ($XXX), Late fee charged ($XXX), Payment plan modified, Final payment - gown released, Default notice sent.`
  }

  if (n.includes('sale') || n.includes('pos') || n.includes('transaction') || n.includes('register')) {
    return `Fields: id, transactionDate, brideName, gownStyle, costPrice ($), retailPrice ($), discountGiven ($), finalSalePrice ($), margin (%), paymentMethod, salesPerson, status (Completed/Refunded/Partial-Refund/Layaway).
Stats: Sales Today ($), This Month Revenue ($), Avg Transaction ($), Total Margin % This Month.
FormFields: Bride Name (select), Gown Style (select), Retail Price ($, number), Discount ($, number), Payment Method (select: Cash/Credit Card/Check/Zelle/Venmo/Layaway/Split), Sales Person (select), Notes (textarea).
SubRecords: Receipt issued, Commission credited to stylist ($XXX), Deposit split processed, Refund $XXX issued, Gown tagged for alteration, Pickup scheduled (date).`
  }

  if (n.includes('report') || n.includes('analytic') || n.includes('dashboard')) {
    return `Fields: id, reportName, period, category (Sales/Inventory/Payroll/Vendor/Alterations), totalRevenue ($), totalCost ($), grossProfit ($), marginPct (%), status (Generated/Scheduled/Draft).
Stats: Revenue MTD ($), Cost of Goods ($), Gross Profit ($), Overall Margin %.
FormFields: Report Type (select), Date Range Start, Date Range End, Location (select: All/Each location), Group By (select: Day/Week/Month/Stylist/Category), Format (select: Summary/Detailed), Notes (textarea).
SubRecords: Revenue by location breakdown, Top 5 selling designers, Commission summary by stylist, Inventory turnover by category, Vendor payables summary, YTD comparison generated.`
  }

  if (n.includes('setting') || n.includes('config') || n.includes('preference')) {
    return `Fields: id, category (Store/Tax/Payment/Notifications/Integrations/Staff), settingName, currentValue, lastModifiedBy, lastModifiedDate, status (Active/Inactive/Pending).
Stats: Locations Configured, Active Integrations, Tax Rate (%), Last Backup Date.
FormFields: Category (select), Setting Name, Value, Description (textarea).
SubRecords: Setting changed (old → new value), Integration connected, Tax rate updated, Location added, Notification preference updated, Backup completed.`
  }

  return `Generate comprehensive retail boutique data for the "${pageName}" page including cost pricing, retail pricing, and payment terms where applicable.`
}

// ── AI: Request data for a page ───────────────────────────────────────────────
async function fetchPageData(
  page: SkeletonPage,
  spec: Record<string, unknown>,
  projectName: string
): Promise<PageData> {
  const specStr = JSON.stringify(spec).slice(0, 500)
  const hint = getPageTypeHint(page.name)
  const prompt = `Boutique Name: ${projectName}
Business: ${spec.description || 'Luxury bridal boutique retail store'}
Context: ${specStr}

Generate realistic retail boutique data for the "${page.name}" page.

Page-specific guide:
${hint}

REQUIREMENTS:
- Use actual ${projectName} business context (real location names, realistic staff names)
- All monetary values as "$X,XXX" formatted strings
- Stats must be unique to this page — different numbers/labels than any other page
- Sub-records must reference specific dollar amounts, dates, and names
- If this page involves products/inventory: ALWAYS include costPrice AND retailPrice AND margin fields`

  const raw = await callClaude(DATA_SYSTEM, prompt, [], 4096)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as PageData
}

// ── Validate ──────────────────────────────────────────────────────────────────
function validatePageData(data: unknown): data is PageData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.fields) || d.fields.length < 2) return false
  if (!Array.isArray(d.records) || d.records.length < 1) return false
  if (!Array.isArray(d.stats) || d.stats.length < 1) return false
  if (!Array.isArray(d.formFields) || d.formFields.length < 1) return false
  if (!Array.isArray(d.subRecords)) return false
  return true
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runPageAgent(
  pages: SkeletonPage[],
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetriesPerPage = 2
): Promise<{ path: string; content: string }[]> {
  onStatus(`Page Agent: Generating ${pages.length} full retail pages...`)

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      for (let attempt = 1; attempt <= maxRetriesPerPage; attempt++) {
        try {
          onStatus(`${page.name}: Generating retail data (${attempt})...`)
          const data = await fetchPageData(page, spec, projectName)
          if (validatePageData(data)) {
            const content = buildPageFromData(page.name, page.route, data)
            const sanitized = sanitizeFileContent(page.path, content)
            onStatus(`${page.name}: Done`)
            return { path: page.path, content: sanitized }
          }
          onStatus(`${page.name}: Validation failed, retrying...`)
        } catch (e: any) {
          onStatus(`${page.name}: ${e.message?.slice(0, 50)} (attempt ${attempt})`)
        }
      }
      onStatus(`${page.name}: Using safe stub`)
      return { path: page.path, content: generateSafeStub(page.name, page.route) }
    })
  )

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { path: pages[i].path, content: generateSafeStub(pages[i].name, pages[i].route) }
  })
}
