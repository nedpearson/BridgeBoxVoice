import { Check, Zap } from 'lucide-react'

const TIERS = [
  {
    name: 'Starter', price: 49, description: 'Perfect for solo founders and small businesses',
    features: ['1 active project', 'Web deployment only', 'Up to 5 integrations', '10 team members', 'Community support', '5 voice recordings/month'],
    cta: 'Start Free Trial', highlight: false,
  },
  {
    name: 'Professional', price: 149, description: 'For growing teams building multiple apps',
    features: ['3 active projects', 'Web + iOS + Android', 'Unlimited integrations', '50 team members', 'Priority email support', 'Unlimited recordings', 'Custom domains', 'Version history (90 days)'],
    cta: 'Start Pro Trial', highlight: true,
  },
  {
    name: 'Business', price: 399, description: 'For agencies and multi-product companies',
    features: ['10 active projects', 'All platforms + Desktop', 'White-label branding', '200 team members', 'Phone & chat support', 'App Store submission', 'Advanced analytics', 'API access', 'SLA: 99.9% uptime'],
    cta: 'Start Business Trial', highlight: false,
  },
  {
    name: 'Enterprise', price: null, description: 'Unlimited scale with dedicated support and self-hosting',
    features: ['Unlimited projects', 'All platforms', 'Self-hosted option', 'Unlimited users', 'Dedicated account manager', 'Custom SLAs', 'HIPAA compliance', 'Penetration test reports', 'Custom AI model tuning'],
    cta: 'Contact Sales', highlight: false,
  },
]

export default function Pricing() {
  return (
    <div className="p-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 px-4 py-1.5 rounded-full mb-4">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-400 text-sm font-semibold">Simple, transparent pricing</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Choose your plan</h1>
        <p className="text-slate-400">Start free. Scale as you grow. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {TIERS.map(({ name, price, description, features, cta, highlight }) => (
          <div key={name} className={`relative rounded-2xl p-6 flex flex-col ${highlight ? 'bg-blue-600 border-2 border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.3)]' : 'bg-[#131B2B] border border-[#1E293B]'}`}>
            {highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-blue-700 text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>
            )}
            <div className="mb-5">
              <h3 className={`font-bold text-lg ${highlight ? 'text-white' : 'text-white'}`}>{name}</h3>
              <p className={`text-sm mt-1 ${highlight ? 'text-blue-200' : 'text-slate-500'}`}>{description}</p>
            </div>
            <div className="mb-5">
              {price ? (
                <>
                  <span className={`text-4xl font-bold ${highlight ? 'text-white' : 'text-white'}`}>${price}</span>
                  <span className={`text-sm ${highlight ? 'text-blue-200' : 'text-slate-500'}`}>/month</span>
                </>
              ) : (
                <span className="text-3xl font-bold text-white">Custom</span>
              )}
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {features.map(f => (
                <li key={f} className={`flex items-start gap-2 text-sm ${highlight ? 'text-blue-100' : 'text-slate-300'}`}>
                  <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-white' : 'text-emerald-400'}`} />
                  {f}
                </li>
              ))}
            </ul>
            <button className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${highlight ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600/10 border border-blue-600/30 text-blue-400 hover:bg-blue-600/20'}`}>
              {cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
