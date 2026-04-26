/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  PAGE AGENT v5 â€” Unlimited Drill-Down Architecture       â•‘
 * â•‘  AI generates JSON data. Template builds the UI.         â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'
import { buildPageFromData, type PageData } from './pageTemplate'


// â”€â”€ AI: Data-Only Prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DATA_SYSTEM = `You are a domain expert data generator for a business SaaS application.
Output ONLY valid JSON matching this schema (NO example values â€” generate REAL values for the specific page):

{
  "fields": [...column keys, camelCase, 3-6 items, always include 'id' and 'name'],
  "records": [...6-8 records, each object has all field keys with realistic values],
  "stats": [...exactly 4 stat objects { "label": string, "value": string|number } relevant to THIS page],
  "formFields": [...3-6 form field objects { "key": string, "label": string, "type": "text"|"date"|"select"|"textarea", "options"?: string[] }],
  "subRecords": [...6-10 child records { "id": number, "parentId": number (must match a record id), "title": string, "date": "YYYY-MM-DD", "status": string }]
}

CRITICAL RULES:
- stats MUST be specific to this page (e.g. Appointments page: "Total Appointments", "This Week", "No-Shows", "Revenue"; NOT generic Total/Active/Pending)
- fields MUST match the domain (e.g. Gown Inventory: gownId, style, designer, size, price, status, NOT just name/status/date)
- formFields MUST use domain-specific labels (e.g. for Appointments: "Bride Name", "Appointment Type", "Stylist", "Location")
- subRecords titles should describe domain activity (e.g. for a customer: "Fitting scheduled", "Gown reserved", "Alteration requested")
- records MUST use real industry names/values â€” NO placeholder text like 'Record A' or 'Item 1'
- Do NOT repeat the same stat values across different pages
- Return ONLY JSON. No markdown. No explanation.`

// buildPageFromData is imported from ./pageTemplate

function getPageTypeHint(pageName: string): string {
  const n = pageName.toLowerCase()
  if (n.includes('appointment') || n.includes('booking')) {
    return 'Fields: bride, appointmentType, stylist, location, time, status. Stats: total bookings, this week, upcoming, revenue. Sub-records: consultation notes, gown try-ons, follow-up calls.'
  }
  if (n.includes('customer') || n.includes('bride') || n.includes('client')) {
    return 'Fields: brideName, email, phone, weddingDate, location, status. Stats: total brides, active, upcoming weddings this month, avg spend. Sub-records: appointments, gown reservations, payment history.'
  }
  if (n.includes('inventory') || n.includes('gown') || n.includes('dress') || n.includes('product')) {
    return 'Fields: styleId, gownName, designer, size, price, availability. Stats: total gowns, available, in alteration, total inventory value. Sub-records: reservation history, alteration requests, try-on logs.'
  }
  if (n.includes('alteration')) {
    return 'Fields: brideName, gownStyle, alterationType, tailor, dueDate, status. Stats: total alterations, in progress, completed this month, overdue. Sub-records: measurement notes, fitting dates, customer calls.'
  }
  if (n.includes('pickup') || n.includes('delivery')) {
    return 'Fields: brideName, gownId, scheduledDate, location, assignedTo, status. Stats: total pickups, scheduled, completed today, pending. Sub-records: confirmation calls, delivery notes, payment receipts.'
  }
  if (n.includes('employee') || n.includes('staff') || n.includes('scheduling')) {
    return 'Fields: employeeName, role, location, shift, hoursWeek, status. Stats: total staff, stylists, tailors, hours scheduled this week. Sub-records: shift logs, performance notes, training completions.'
  }
  if (n.includes('payroll') || n.includes('pay')) {
    return 'Fields: employeeName, role, hoursWorked, hourlyRate, grossPay, status. Stats: total payroll this period, employees paid, pending approvals, avg hours. Sub-records: overtime entries, deductions, payment confirmations.'
  }
  if (n.includes('vendor') || n.includes('supplier') || n.includes('order')) {
    return 'Fields: vendorName, brand, orderItems, orderDate, deliveryDate, status. Stats: active vendors, open orders, orders this month, total spend. Sub-records: invoices, delivery confirmations, return requests.'
  }
  if (n.includes('report') || n.includes('analytics')) {
    return 'Fields: reportName, period, category, generatedBy, status. Stats: reports this month, revenue YTD, top location, conversion rate. Sub-records: data breakdowns, export logs, scheduled runs.'
  }
  if (n.includes('calendar') || n.includes('schedule')) {
    return 'Fields: eventTitle, eventType, location, assignedTo, startDate, status. Stats: events this week, upcoming, completed, staff scheduled. Sub-records: RSVP confirmations, room setup notes, resource bookings.'
  }
  if (n.includes('setting') || n.includes('config')) {
    return 'Fields: settingCategory, settingName, currentValue, lastModified, modifiedBy. Stats: total settings, recently changed, active integrations, locations configured. Sub-records: audit log of changes.'
  }
  if (n.includes('payment') || n.includes('invoice') || n.includes('finance')) {
    return 'Fields: customerName, invoiceId, amount, dueDate, paymentMethod, status. Stats: total invoiced, collected this month, overdue, avg transaction. Sub-records: payment installments, receipts, refund requests.'
  }
  return `Generate data specific to the ${pageName} business function with domain-appropriate fields, stats, and sub-records.`
}

// â”€â”€ AI: Request data for a page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchPageData(
  page: SkeletonPage,
  spec: Record<string, unknown>,
  projectName: string
): Promise<PageData> {
  const specStr = JSON.stringify(spec).slice(0, 600)
  const hint = getPageTypeHint(page.name)
  const prompt = `Project: ${projectName}
Business Type: ${spec.description || spec.type || 'Business'}
Spec context: ${specStr}

Generate data for the "${page.name}" page.
Domain guide for this page: ${hint}

IMPORTANT:
- stats values must be DIFFERENT from other pages and realistic for ${page.name}
- fields must be specific to "${page.name}" â€” NOT generic (no 'name/status/date' only)
- Use realistic ${projectName} business data (actual boutique locations, real-sounding staff names, relevant product names)
- sub-record titles should describe real ${page.name.toLowerCase()} activities`

  const raw = await callClaude(DATA_SYSTEM, prompt, [], 4096)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as PageData
}

// â”€â”€ Validate page data has required fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Main: Generate all pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function runPageAgent(
  pages: SkeletonPage[],
  spec: Record<string, unknown>,
  projectName: string,
  onStatus: (msg: string) => void,
  maxRetriesPerPage = 2
): Promise<{ path: string; content: string }[]> {
  onStatus(`Page Agent: Generating ${pages.length} pages with full drill-downs...`)

  const results = await Promise.allSettled(
    pages.map(async (page) => {
      // Attempt to get AI data
      for (let attempt = 1; attempt <= maxRetriesPerPage; attempt++) {
        try {
          onStatus(`${page.name}: Fetching data (attempt ${attempt})...`)
          const data = await fetchPageData(page, spec, projectName)
          if (validatePageData(data)) {
            onStatus(`${page.name}: Building page from template...`)
            const content = buildPageFromData(page.name, page.route, data)
            const sanitized = sanitizeFileContent(page.path, content)
            onStatus(`${page.name}: Done`)
            return { path: page.path, content: sanitized }
          }
          onStatus(`${page.name}: Data validation failed (attempt ${attempt})`)
        } catch (e: any) {
          onStatus(`${page.name}: Error - ${e.message?.slice(0, 50)} (attempt ${attempt})`)
        }
      }

      // Final fallback: guaranteed safe stub
      onStatus(`${page.name}: Using safe stub`)
      return { path: page.path, content: generateSafeStub(page.name, page.route) }
    })
  )

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { path: pages[i].path, content: generateSafeStub(pages[i].name, pages[i].route) }
  })
}
