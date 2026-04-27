/**
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘  PAGE AGENT v6 â€” Full Retail Boutique Data Engine        â•‘
 * â•‘  Cost price, retail price, margins, payment terms        â•‘
 * â•‘  Vendor management, layaway, commissions, POS            â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

import { callClaude } from '../anthropic'
import { sanitizeFileContent, generateSafeStub } from './sanitizerAgent'
import type { SkeletonPage } from './skeletonAgent'
import { buildPageFromData, buildCalendarPage, type PageData } from './pageTemplate'

// â”€â”€ Retail-specific data generation prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DATA_SYSTEM = `You are a retail boutique business data expert.
Output ONLY valid JSON matching this schema. Generate REAL, specific values â€” never use placeholders.

{
  "fields": [...column keys, camelCase, 4-7 items, always include 'id' and a primary name field],
  "records": [...7-9 records with all field keys and realistic retail boutique values],
  "stats": [...exactly 4 stat objects { "label": string, "value": string|number } â€” SPECIFIC to this page, never repeat across pages],
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

// â”€â”€ Full retail boutique page-type hints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
SubRecords: Setting changed (old â†’ new value), Integration connected, Tax rate updated, Location added, Notification preference updated, Backup completed.`
  }

  return `Generate comprehensive retail boutique data for the "${pageName}" page including cost pricing, retail pricing, and payment terms where applicable.`
}

// â”€â”€ AI: Request data for a page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
- Stats must be unique to this page â€” different numbers/labels than any other page
- Sub-records must reference specific dollar amounts, dates, and names
- If this page involves products/inventory: ALWAYS include costPrice AND retailPrice AND margin fields`

  const raw = await callClaude(DATA_SYSTEM, prompt, [], 4096)
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as PageData
}

// â”€â”€ Validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Settings page: real controls that save to localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateSettingsPage(pageName: string, projectName: string): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  return `import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, X, Check, Settings, MapPin, DollarSign, CreditCard, Bell, Users, FileText, Clock } from 'lucide-react';

const STORAGE_KEY = '${projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_settings';

const DEFAULTS = {
  storeName: '${projectName}',
  phone: '(504) 555-0100',
  email: 'info@boutique.com',
  website: 'www.boutique.com',
  address: '123 Main St, Baton Rouge, LA 70801',
  taxRate: '8.5',
  defaultMarkup: '120',
  currency: 'USD',
  layawayMinDeposit: '20',
  layawayTermOptions: ['3 months', '6 months', '9 months', '12 months'],
  defaultLayawayTerm: '6 months',
  alterationMarkup: '40',
  rushFeeAmount: '75',
  paymentMethods: { cash: true, creditCard: true, check: true, zelle: true, venmo: true, layaway: true, splitPayment: true },
  locations: [
    { id: 1, name: '${projectName} - Main', address: '123 Main St, Baton Rouge, LA', phone: '(504) 555-0100', hours: 'Mon-Sat 10AM-6PM, Sun 12PM-5PM', active: true },
    { id: 2, name: '${projectName} - Covington', address: '456 Oak Ave, Covington, LA', phone: '(985) 555-0200', hours: 'Tue-Sat 10AM-6PM', active: true },
  ],
  commissionRates: { owner: '0', manager: '3', seniorStylist: '5', stylist: '4', partTime: '3' },
  notifications: { appointmentConfirm: true, appointmentReminder: true, layawayDue: true, alterationReady: true, lowInventory: true, orderArrival: true },
  receiptHeader: '${projectName}',
  receiptFooter: 'Thank you for choosing us for your special day!',
  invoiceTerms: 'Payment due upon receipt unless otherwise agreed in writing.',
  invoicePrefix: 'INV-',
  poPrefix: 'PO-',
  appointmentDuration: '90',
  appointmentBuffer: '15',
};

type Settings = typeof DEFAULTS;
type Location = Settings['locations'][0];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={\`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 \${checked ? 'bg-purple-600' : 'bg-slate-700'}\`}>
      <span className={\`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform \${checked ? 'translate-x-5' : ''}\`} />
    </button>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1e293b] rounded-2xl border border-[#334155] overflow-hidden mb-4">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#334155] bg-[#0f172a]">
        <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-purple-400" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', prefix }: { value: string; onChange: (v: string) => void; type?: string; prefix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={\`w-full bg-[#0f172a] border border-[#334155] rounded-lg py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 \${prefix ? 'pl-7 pr-3' : 'px-3'}\`} />
    </div>
  );
}

export default function ${safe}() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setS({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (key: keyof Settings, val: any) => setS(prev => ({ ...prev, [key]: val }));
  const setNested = (key: keyof Settings, subKey: string, val: any) => setS(prev => ({ ...prev, [key]: { ...(prev[key] as any), [subKey]: val } }));

  const tabs = [
    { id: 'store', label: 'Store Info', icon: Settings },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'scheduling', label: 'Scheduling', icon: Clock },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-0.5">Configure your boutique operations</p>
        </div>
        <button onClick={save} className={\`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all \${saved ? 'bg-emerald-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30'}\`}>
          {saved ? <><Check size={16} />Saved!</> : <><Save size={16} />Save Changes</>}
        </button>
      </div>

      <div className="flex gap-1 bg-[#0f172a] rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={\`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all \${activeTab === t.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}\`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'store' && (
        <Section icon={Settings} title="Store Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Business Name"><Input value={s.storeName} onChange={v => set('storeName', v)} /></Field>
            <Field label="Phone Number"><Input value={s.phone} onChange={v => set('phone', v)} /></Field>
            <Field label="Email Address"><Input value={s.email} onChange={v => set('email', v)} /></Field>
            <Field label="Website"><Input value={s.website} onChange={v => set('website', v)} /></Field>
            <div className="col-span-2">
              <Field label="Primary Address"><Input value={s.address} onChange={v => set('address', v)} /></Field>
            </div>
            <Field label="Currency">
              <select value={s.currency} onChange={e => set('currency', e.target.value)} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
                <option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option>
              </select>
            </Field>
          </div>
        </Section>
      )}

      {activeTab === 'locations' && (
        <Section icon={MapPin} title="Store Locations">
          <div className="space-y-3 mb-4">
            {s.locations.map(loc => (
              <div key={loc.id} className="bg-[#0f172a] rounded-xl p-4 border border-[#334155]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-sm">{loc.name}</p>
                      <span className={\`text-xs px-2 py-0.5 rounded-full \${loc.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}\`}>{loc.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-slate-400 text-xs">{loc.address}</p>
                    <p className="text-slate-400 text-xs">{loc.phone} Â· {loc.hours}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Toggle checked={loc.active} onChange={v => set('locations', s.locations.map(l => l.id === loc.id ? { ...l, active: v } : l))} />
                    <button onClick={() => setEditingLoc({ ...loc })} className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors"><Settings size={14} /></button>
                    <button onClick={() => set('locations', s.locations.filter(l => l.id !== loc.id))} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setEditingLoc({ id: Date.now(), name: '', address: '', phone: '', hours: 'Mon-Sat 10AM-6PM', active: true })}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] border border-dashed border-[#334155] text-slate-400 hover:text-purple-400 hover:border-purple-500/50 rounded-xl text-sm transition-colors w-full justify-center">
            <Plus size={16} />Add Location
          </button>
          {editingLoc && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1e293b] rounded-2xl border border-[#334155] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
                  <h3 className="text-lg font-bold text-white">{editingLoc.id && s.locations.find(l => l.id === editingLoc.id) ? 'Edit' : 'New'} Location</h3>
                  <button onClick={() => setEditingLoc(null)} className="p-1.5 text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <Field label="Location Name"><Input value={editingLoc.name} onChange={v => setEditingLoc(l => l ? { ...l, name: v } : l)} /></Field>
                  <Field label="Address"><Input value={editingLoc.address} onChange={v => setEditingLoc(l => l ? { ...l, address: v } : l)} /></Field>
                  <Field label="Phone"><Input value={editingLoc.phone} onChange={v => setEditingLoc(l => l ? { ...l, phone: v } : l)} /></Field>
                  <Field label="Hours"><Input value={editingLoc.hours} onChange={v => setEditingLoc(l => l ? { ...l, hours: v } : l)} /></Field>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={() => setEditingLoc(null)} className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-xl text-sm font-semibold hover:bg-[#263148] transition-colors">Cancel</button>
                  <button onClick={() => {
                    const exists = s.locations.find(l => l.id === editingLoc!.id);
                    set('locations', exists ? s.locations.map(l => l.id === editingLoc!.id ? editingLoc! : l) : [...s.locations, editingLoc!]);
                    setEditingLoc(null);
                  }} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors">Save Location</button>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}

      {activeTab === 'financial' && (
        <Section icon={DollarSign} title="Financial Settings">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sales Tax Rate" hint="Applied to all taxable transactions"><Input value={s.taxRate} onChange={v => set('taxRate', v)} prefix="%" /></Field>
            <Field label="Default Gown Markup" hint="Applied when creating inventory from cost price"><Input value={s.defaultMarkup} onChange={v => set('defaultMarkup', v)} prefix="%" /></Field>
            <Field label="Alteration Markup" hint="Markup on tailor cost to charge customer"><Input value={s.alterationMarkup} onChange={v => set('alterationMarkup', v)} prefix="%" /></Field>
            <Field label="Rush Fee (flat)" hint="Added when alteration is marked rush"><Input value={s.rushFeeAmount} onChange={v => set('rushFeeAmount', v)} prefix="$" /></Field>
            <Field label="Min Layaway Deposit" hint="Minimum % required to start layaway"><Input value={s.layawayMinDeposit} onChange={v => set('layawayMinDeposit', v)} prefix="%" /></Field>
            <Field label="Default Layaway Term">
              <select value={s.defaultLayawayTerm} onChange={e => set('defaultLayawayTerm', e.target.value)} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
                {s.layawayTermOptions.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </Section>
      )}

      {activeTab === 'payments' && (
        <Section icon={CreditCard} title="Accepted Payment Methods">
          <div className="space-y-3">
            {Object.entries(s.paymentMethods).map(([method, enabled]) => (
              <div key={method} className="flex items-center justify-between bg-[#0f172a] rounded-xl px-4 py-3 border border-[#334155]">
                <div>
                  <p className="text-white text-sm font-medium capitalize">{method.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-slate-500 text-xs">{method === 'splitPayment' ? 'Allow combining two payment methods' : method === 'layaway' ? 'Installment payment plan' : ('Accept ' + method.replace(/([A-Z])/g, ' ' + '$' + '1').trim() + ' payments')}</p>
                </div>
                <Toggle checked={enabled as boolean} onChange={v => setNested('paymentMethods', method, v)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeTab === 'staff' && (
        <Section icon={Users} title="Commission Rates by Role">
          <p className="text-slate-400 text-sm mb-4">Commission is calculated as a % of the retail sale price and paid in payroll.</p>
          <div className="space-y-3">
            {Object.entries(s.commissionRates).map(([role, rate]) => (
              <div key={role} className="flex items-center justify-between bg-[#0f172a] rounded-xl px-4 py-3 border border-[#334155]">
                <p className="text-white text-sm font-medium capitalize">{role.replace(/([A-Z])/g, ' $1').trim()}</p>
                <div className="flex items-center gap-2">
                  <Input value={rate as string} onChange={v => setNested('commissionRates', role, v)} prefix="%" />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeTab === 'notifications' && (
        <Section icon={Bell} title="Notification Preferences">
          <div className="space-y-3">
            {[
              { key: 'appointmentConfirm', label: 'Appointment Confirmations', desc: 'Send confirmation email/SMS when appointment is booked' },
              { key: 'appointmentReminder', label: 'Appointment Reminders', desc: 'Send reminder 24 hours before appointment' },
              { key: 'layawayDue', label: 'Layaway Payment Due', desc: 'Notify customer 3 days before payment due date' },
              { key: 'alterationReady', label: 'Alteration Ready for Pickup', desc: 'Notify bride when alterations are complete' },
              { key: 'lowInventory', label: 'Low Inventory Alerts', desc: 'Alert when a gown size has fewer than 2 units' },
              { key: 'orderArrival', label: 'Vendor Order Arrival', desc: 'Notify manager when a PO is marked received' },
            ].map(n => (
              <div key={n.key} className="flex items-start justify-between bg-[#0f172a] rounded-xl px-4 py-3 border border-[#334155] gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{n.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{n.desc}</p>
                </div>
                <Toggle checked={(s.notifications as any)[n.key]} onChange={v => setNested('notifications', n.key, v)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {activeTab === 'documents' && (
        <Section icon={FileText} title="Invoice & Receipt Settings">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice Number Prefix" hint="e.g. INV-0001"><Input value={s.invoicePrefix} onChange={v => set('invoicePrefix', v)} /></Field>
            <Field label="Purchase Order Prefix" hint="e.g. PO-0001"><Input value={s.poPrefix} onChange={v => set('poPrefix', v)} /></Field>
            <div className="col-span-2">
              <Field label="Receipt Header Text"><Input value={s.receiptHeader} onChange={v => set('receiptHeader', v)} /></Field>
            </div>
            <div className="col-span-2">
              <Field label="Receipt Footer Message">
                <textarea value={s.receiptFooter} onChange={e => set('receiptFooter', e.target.value)} rows={2} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Invoice Payment Terms (default)">
                <textarea value={s.invoiceTerms} onChange={e => set('invoiceTerms', e.target.value)} rows={2} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
              </Field>
            </div>
          </div>
        </Section>
      )}

      {activeTab === 'scheduling' && (
        <Section icon={Clock} title="Appointment Scheduling">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Appointment Duration" hint="Minutes per appointment slot"><Input value={s.appointmentDuration} onChange={v => set('appointmentDuration', v)} /></Field>
            <Field label="Buffer Between Appointments" hint="Buffer time in minutes between bookings"><Input value={s.appointmentBuffer} onChange={v => set('appointmentBuffer', v)} /></Field>
            <div className="col-span-2">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Business Hours (per location â€” edit in Locations tab)</p>
              <div className="space-y-2">
                {s.locations.map(loc => (
                  <div key={loc.id} className="flex items-center justify-between bg-[#0f172a] rounded-lg px-4 py-2.5 border border-[#334155]">
                    <span className="text-white text-sm">{loc.name}</span>
                    <span className="text-slate-400 text-xs">{loc.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}`
}

// â”€â”€ Main: Generate all pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const n = page.name.toLowerCase()

      // Settings pages get a real functional settings UI â€” not the generic template
      if (n.includes('setting') || n.includes('config') || n.includes('preference')) {
        onStatus(`${page.name}: Building real settings page...`)
        const content = generateSettingsPage(page.name, projectName)
        // Settings is hand-crafted trusted code — skip sanitizer to preserve all icon imports
        return { path: page.path, content }
      }

      for (let attempt = 1; attempt <= maxRetriesPerPage; attempt++) {
        try {
          onStatus(`${page.name}: Generating retail data (${attempt})...`)
          const data = await fetchPageData(page, spec, projectName)
          if (validatePageData(data)) {
            const isCalPage = /appointment|booking|schedule|calendar/i.test(page.name)
            const builder = isCalPage ? buildCalendarPage : buildPageFromData
            const content = builder(page.name, page.route, data)
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

