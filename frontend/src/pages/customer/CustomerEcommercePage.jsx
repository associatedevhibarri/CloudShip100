import { useMemo, useState } from 'react'
import {
  ShoppingBag,
  Plug,
  Calculator,
  Package,
  Code2,
  Copy,
  Check,
  Unplug,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { FormField, formInputClass, SectionHeader } from '../../components/ui/FormField'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'
import { DataTable } from '../../components/ui/DataTable'

const PLATFORMS = [
  {
    id: 'woocommerce',
    label: 'WooCommerce',
    hint: 'Free. Keys come from your WordPress / Woo admin — not from CloudShip .env.',
    docsUrl: null,
    steps: [
      'Open your Woo store WP Admin (Local or live).',
      'Go to WooCommerce → Settings → Advanced → REST API → Add key.',
      'Permissions: Read/Write → Generate API key.',
      'Copy Consumer key (ck_…) and Consumer secret (cs_…) into the form below.',
      'Store URL = your site URL (e.g. http://woocommerse.local).',
    ],
    fieldsNeeded: 'Store URL + Consumer key + Consumer secret + Pickup address',
  },
  {
    id: 'shopify',
    label: 'Shopify',
    hint: 'Free with a Partner development store. You need shop domain + shpat_ token.',
    docsUrl: 'https://partners.shopify.com',
    steps: [
      'Create a free Partner account at partners.shopify.com → create a Development store.',
      'In that store: Settings → Apps and sales channels → Develop apps → Create an app (CloudShip).',
      'Configure Admin API scopes: read/write orders, read/write shipping, fulfillments → Save → Install app.',
      'API credentials → Reveal Admin API access token (shpat_…) — copy it once.',
      'Paste shop domain (store.myshopify.com) + access token below. Do not put shpat_ in .env.',
    ],
    fieldsNeeded: 'Shop domain + Access token (shpat_…) + Pickup address',
  },
  {
    id: 'wix',
    label: 'Wix',
    hint: 'Get an access token from Wix Dev Center for your eCommerce site.',
    docsUrl: 'https://dev.wix.com',
    steps: [
      'Go to Wix Dev Center (dev.wix.com) and create / open your app.',
      'Connect a test site that has Wix eCommerce enabled.',
      'Generate or copy an access token with eCommerce permissions.',
      'Paste the access token below with your pickup address.',
    ],
    fieldsNeeded: 'Access token + Pickup address',
  },
  {
    id: 'lovable',
    label: 'Lovable / Universal',
    hint: 'No keys from Lovable. CloudShip creates publicApiKey + webhookSecret after connect.',
    docsUrl: null,
    steps: [
      'Choose this for Lovable apps or any custom store that can call our webhooks.',
      'Enter store name + pickup only — no external API key needed.',
      'After Connect, copy publicApiKey and webhookSecret (shown once).',
      'Your app sends rates/orders to /v1/webhooks/lovable/* with header X-CloudShip-Key.',
    ],
    fieldsNeeded: 'Store name + Pickup address only',
  },
]

function PlatformKeyGuide({ platform }) {
  if (!platform) return null
  return (
    <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <BookOpen size={16} className="text-sky-700" />
        <p className="font-extrabold text-ink">Where to get your keys — {platform.label}</p>
        {platform.docsUrl ? (
          <a
            href={platform.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand underline"
          >
            Open site <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
      <p className="mb-2 text-xs text-muted">{platform.hint}</p>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-800">
        You will paste: {platform.fieldsNeeded}
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-ink">
        {platform.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] font-semibold text-amber-800">
        Tip: Shop keys go in this form only. CloudShip .env is for server settings (Mongo, JWT, margin) — not Woo/Shopify tokens.
      </p>
    </div>
  )
}

const emptyForm = {
  platform: 'woocommerce',
  storeName: '',
  storeUrl: '',
  pickupAddress: 'Cape Town',
  currency: 'ZAR',
  consumerKey: '',
  consumerSecret: '',
  shopDomain: '',
  accessToken: '',
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface disabled:opacity-50'

function buildCredentials(form) {
  const pickupAddress = form.pickupAddress.trim()
  if (form.platform === 'woocommerce') {
    return {
      consumerKey: form.consumerKey.trim(),
      consumerSecret: form.consumerSecret.trim(),
      pickupAddress,
      storeUrl: form.storeUrl.trim(),
    }
  }
  if (form.platform === 'shopify') {
    return {
      shopDomain: form.shopDomain.trim() || form.storeUrl.trim(),
      accessToken: form.accessToken.trim(),
      pickupAddress,
    }
  }
  if (form.platform === 'wix') {
    return {
      accessToken: form.accessToken.trim(),
      pickupAddress,
    }
  }
  return { pickupAddress }
}

export default function CustomerEcommercePage() {
  const { tokens } = useAuth()
  const toast = useToast()
  const token = tokens?.access?.token

  const {
    data: stores,
    loading: storesLoading,
    error: storesError,
    refetch: refetchStores,
  } = usePortalFetch(portalService.listEcommerceStores)

  const {
    data: bookings,
    loading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = usePortalFetch(portalService.getMyBookings)

  const [form, setForm] = useState(emptyForm)
  const [connecting, setConnecting] = useState(false)
  const [lastConnected, setLastConnected] = useState(null)

  const [quoteForm, setQuoteForm] = useState({
    connectionId: '',
    pickup: 'Cape Town',
    dropoff: 'Johannesburg',
    weightKg: '2',
  })
  const [quoteResult, setQuoteResult] = useState(null)
  const [quoting, setQuoting] = useState(false)

  const [payingId, setPayingId] = useState(null)
  const [copied, setCopied] = useState('')

  const storeList = stores || []
  const marketplaceBookings = useMemo(
    () =>
      (bookings || []).filter((b) =>
        ['woocommerce', 'shopify', 'wix', 'lovable'].includes(b.source)
      ),
    [bookings]
  )

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sampleCode = marketplaceBookings[0]?.code || 'BKG-MKT-00001'
  const iframeSnippet = `<iframe src="${origin}/embed/track?code=${sampleCode}" width="100%" height="220" style="border:0;border-radius:12px" title="CloudShip tracking"></iframe>`
  const shortcodeSnippet = `[cloudship_track code="${sampleCode}"]`

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const connectStore = async (e) => {
    e.preventDefault()
    if (!form.storeName.trim()) {
      toast.error('Store name is required')
      return
    }
    setConnecting(true)
    try {
      const body = {
        platform: form.platform,
        storeName: form.storeName.trim(),
        storeUrl:
          form.platform === 'shopify'
            ? form.shopDomain.trim() || form.storeUrl.trim()
            : form.storeUrl.trim(),
        credentials: buildCredentials(form),
        settings: {
          pickupAddress: form.pickupAddress.trim(),
          currency: form.currency.trim() || 'ZAR',
          defaultMode: 'Road',
        },
      }
      const created = await portalService.connectEcommerceStore(token, body)
      setLastConnected(created)
      setForm({ ...emptyForm, platform: form.platform, pickupAddress: form.pickupAddress })
      refetchStores()
      toast.success(`${created.platform} store connected`)
    } catch (err) {
      toast.error(err.message || 'Failed to connect store')
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = async (connectionId) => {
    try {
      await portalService.disconnectEcommerceStore(token, connectionId)
      toast.success('Store disconnected')
      refetchStores()
    } catch (err) {
      toast.error(err.message || 'Disconnect failed')
    }
  }

  const runQuote = async (e) => {
    e.preventDefault()
    setQuoting(true)
    setQuoteResult(null)
    try {
      const result = await portalService.createMarketplaceQuote(token, {
        connectionId: quoteForm.connectionId || undefined,
        pickup: quoteForm.pickup.trim(),
        dropoff: quoteForm.dropoff.trim(),
        weightKg: Number(quoteForm.weightKg),
        currency: 'ZAR',
        mode: 'Road',
      })
      setQuoteResult(result)
      toast.success('Live marketplace quote ready')
    } catch (err) {
      toast.error(err.message || 'Quote failed')
    } finally {
      setQuoting(false)
    }
  }

  const confirmPay = async (booking) => {
    setPayingId(booking.id)
    try {
      let paymentIntentId = booking.paymentIntentId
      if (!paymentIntentId || booking.paymentStatus === 'not_required') {
        const payment = await portalService.createMarketplacePayment(token, booking.id)
        paymentIntentId = payment.paymentIntentId
      }
      await portalService.confirmMarketplacePayment(token, paymentIntentId)
      toast.success('Payment confirmed — courier booked (stub until Vasanth)')
      refetchBookings()
    } catch (err) {
      toast.error(err.message || 'Payment confirm failed')
    } finally {
      setPayingId(null)
    }
  }

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      toast.success('Copied')
      setTimeout(() => setCopied(''), 1500)
    } catch {
      toast.error('Copy failed — select and copy manually')
    }
  }

  if (storesLoading || bookingsLoading) {
    return <LoadingState label="Loading e-commerce workspace..." />
  }
  if (storesError) return <ErrorState message={storesError} />
  if (bookingsError) return <ErrorState message={bookingsError} />

  return (
    <div>
      <PageHeader
        title="E-commerce integrations"
        subtitle="Connect WooCommerce, Shopify, Wix or Lovable — see rates with margin, pay, then book. No Postman needed."
      />

      {/* Connected stores */}
      <Card className="mb-6 p-5">
        <SectionHeader
          icon={Plug}
          title="Connected stores"
          description="Each store is a CloudShip connection. Keys stay encrypted on the server — never in .env."
        />
        {storeList.length === 0 ? (
          <p className="text-sm text-muted">No stores yet. Connect one below.</p>
        ) : (
          <DataTable
            columns={[
              { key: 'storeName', label: 'Store' },
              { key: 'platform', label: 'Platform', render: (row) => row.platform },
              {
                key: 'storeUrl',
                label: 'URL',
                render: (row) => row.storeUrl || '—',
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'id',
                label: 'Connection ID',
                render: (row) => (
                  <button type="button" className={btnGhost} onClick={() => copyText(`id-${row.id}`, row.id)}>
                    {copied === `id-${row.id}` ? <Check size={12} /> : <Copy size={12} />}
                    <span className="max-w-[120px] truncate font-mono text-[10px]">{row.id}</span>
                  </button>
                ),
              },
              {
                key: 'action',
                label: '',
                render: (row) =>
                  row.status === 'active' ? (
                    <button type="button" className={btnGhost} onClick={() => disconnect(row.id)}>
                      <Unplug size={12} /> Disconnect
                    </button>
                  ) : null,
              },
            ]}
            rows={storeList}
          />
        )}

        {lastConnected?.webhookSecret || lastConnected?.publicApiKey ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-bold">Save these now (shown once after connect)</p>
            {lastConnected.webhookSecret ? (
              <p className="mt-2 font-mono text-xs">webhookSecret: {lastConnected.webhookSecret}</p>
            ) : null}
            {lastConnected.publicApiKey ? (
              <p className="mt-1 font-mono text-xs">publicApiKey: {lastConnected.publicApiKey}</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* Connect form */}
      <Card className="mb-6 p-5">
        <SectionHeader
          icon={ShoppingBag}
          title="Connect a store"
          description="Pick a platform — we show exactly where to copy keys from. Paste them here (not in .env)."
        />
        <PlatformKeyGuide platform={PLATFORMS.find((p) => p.id === form.platform)} />
        <form onSubmit={connectStore} className="grid gap-4 md:grid-cols-2">
          <FormField id="platform" label="Platform" required>
            <select
              id="platform"
              className={formInputClass()}
              value={form.platform}
              onChange={(e) => setField('platform', e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="storeName" label="Store name" required>
            <input
              id="storeName"
              className={formInputClass()}
              value={form.storeName}
              onChange={(e) => setField('storeName', e.target.value)}
              placeholder="My Woo Shop"
            />
          </FormField>

          {form.platform !== 'lovable' ? (
            <FormField
              id="storeUrl"
              label={form.platform === 'shopify' ? 'Shop domain / URL' : 'Store URL'}
              hint={form.platform === 'woocommerce' ? 'e.g. http://woocommerse.local' : 'e.g. mystore.myshopify.com'}
            >
              <input
                id="storeUrl"
                className={formInputClass()}
                value={form.platform === 'shopify' ? form.shopDomain || form.storeUrl : form.storeUrl}
                onChange={(e) => {
                  if (form.platform === 'shopify') setField('shopDomain', e.target.value)
                  else setField('storeUrl', e.target.value)
                }}
              />
            </FormField>
          ) : null}

          <FormField id="pickupAddress" label="Pickup address" required>
            <input
              id="pickupAddress"
              className={formInputClass()}
              value={form.pickupAddress}
              onChange={(e) => setField('pickupAddress', e.target.value)}
            />
          </FormField>

          {form.platform === 'woocommerce' ? (
            <>
              <FormField id="consumerKey" label="Consumer key (ck_…)" required>
                <input
                  id="consumerKey"
                  className={formInputClass()}
                  value={form.consumerKey}
                  onChange={(e) => setField('consumerKey', e.target.value)}
                  autoComplete="off"
                />
              </FormField>
              <FormField id="consumerSecret" label="Consumer secret (cs_…)" required>
                <input
                  id="consumerSecret"
                  type="password"
                  className={formInputClass()}
                  value={form.consumerSecret}
                  onChange={(e) => setField('consumerSecret', e.target.value)}
                  autoComplete="off"
                />
              </FormField>
            </>
          ) : null}

          {form.platform === 'shopify' || form.platform === 'wix' ? (
            <FormField
              id="accessToken"
              label={form.platform === 'shopify' ? 'Admin API access token (shpat_…)' : 'Wix access token'}
              required
              hint={
                form.platform === 'shopify'
                  ? 'From Develop apps → API credentials → Reveal token'
                  : 'From Wix Dev Center app credentials'
              }
            >
              <input
                id="accessToken"
                type="password"
                className={formInputClass()}
                value={form.accessToken}
                onChange={(e) => setField('accessToken', e.target.value)}
                autoComplete="off"
                placeholder={form.platform === 'shopify' ? 'shpat_…' : 'Access token'}
              />
            </FormField>
          ) : null}

          <div className="md:col-span-2">
            <button type="submit" className={btnPrimary} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect store'}
            </button>
          </div>
        </form>
      </Card>

      {/* Quote tester */}
      <Card className="mb-6 p-5">
        <SectionHeader
          icon={Calculator}
          title="Test marketplace pricing"
          description="Carrier stub price + CloudShip margin — same engine checkout rates use."
        />
        <form onSubmit={runQuote} className="grid gap-4 md:grid-cols-2">
          <FormField id="connectionId" label="Store (optional)">
            <select
              id="connectionId"
              className={formInputClass()}
              value={quoteForm.connectionId}
              onChange={(e) => setQuoteForm((p) => ({ ...p, connectionId: e.target.value }))}
            >
              <option value="">None</option>
              {storeList
                .filter((s) => s.status === 'active')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.storeName} ({s.platform})
                  </option>
                ))}
            </select>
          </FormField>
          <FormField id="weightKg" label="Weight (kg)" required>
            <input
              id="weightKg"
              type="number"
              min="0.1"
              step="0.1"
              className={formInputClass()}
              value={quoteForm.weightKg}
              onChange={(e) => setQuoteForm((p) => ({ ...p, weightKg: e.target.value }))}
            />
          </FormField>
          <FormField id="pickup" label="Pickup" required>
            <input
              id="pickup"
              className={formInputClass()}
              value={quoteForm.pickup}
              onChange={(e) => setQuoteForm((p) => ({ ...p, pickup: e.target.value }))}
            />
          </FormField>
          <FormField id="dropoff" label="Dropoff" required>
            <input
              id="dropoff"
              className={formInputClass()}
              value={quoteForm.dropoff}
              onChange={(e) => setQuoteForm((p) => ({ ...p, dropoff: e.target.value }))}
            />
          </FormField>
          <div className="md:col-span-2">
            <button type="submit" className={btnPrimary} disabled={quoting}>
              {quoting ? 'Getting rates…' : 'Get live quote'}
            </button>
          </div>
        </form>

        {quoteResult ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Partner</th>
                  <th className="px-3 py-2">Carrier</th>
                  <th className="px-3 py-2">Margin</th>
                  <th className="px-3 py-2">Customer pays</th>
                </tr>
              </thead>
              <tbody>
                {(quoteResult.options || []).map((opt) => (
                  <tr key={`${opt.partner}-${opt.service}`} className="border-t border-line">
                    <td className="px-3 py-2 font-semibold text-ink">
                      {opt.partner} / {opt.service}
                    </td>
                    <td className="px-3 py-2">R {opt.carrierCost}</td>
                    <td className="px-3 py-2">R {opt.marginAmount}</td>
                    <td className="px-3 py-2 font-bold text-brand">R {opt.quotedPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line bg-surface px-3 py-2 font-mono text-[11px] text-muted">
              quoteId: {quoteResult.quoteId} · selected R {quoteResult.selected?.quotedPrice}
            </p>
          </div>
        ) : null}
      </Card>

      {/* Marketplace orders */}
      <Card className="mb-6 p-5">
        <SectionHeader
          icon={Package}
          title="Marketplace orders"
          description="Orders from connected shops. Mock-pay to book courier (stub until Vasanth)."
        />
        {marketplaceBookings.length === 0 ? (
          <p className="text-sm text-muted">
            No shop orders yet. Create one via Postman webhook or wait for a real Woo order webhook.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: 'code', label: 'Booking' },
              { key: 'source', label: 'Source' },
              { key: 'externalOrderId', label: 'Shop order' },
              {
                key: 'cargo',
                label: 'Cargo / Product',
                render: (row) => row.cargo || '—',
              },
              {
                key: 'pickup',
                label: 'Pickup',
                render: (row) => row.pickup || '—',
              },
              {
                key: 'dropoff',
                label: 'Dropoff',
                render: (row) => row.dropoff || '—',
              },
              {
                key: 'weightKg',
                label: 'Weight',
                render: (row) => row.weightKg ? `${row.weightKg} kg` : '—',
              },
              {
                key: 'buyerEmail',
                label: 'Buyer Email',
                render: (row) => row.buyerEmail || '—',
              },
              {
                key: 'quotedPrice',
                label: 'Price',
                render: (row) => `R ${row.quotedPrice ?? row.value}`,
              },
              {
                key: 'paymentStatus',
                label: 'Payment',
                render: (row) => <StatusBadge status={row.paymentStatus || 'not_required'} />,
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status || 'pending'} />,
              },
              {
                key: 'logisticsBookingRef',
                label: 'Courier ref',
                render: (row) => row.logisticsBookingRef || '—',
              },
              {
                key: 'bookedAt',
                label: 'Date',
                render: (row) => row.bookedAt ? new Date(row.bookedAt).toLocaleDateString() : '—',
              },
              {
                key: 'action',
                label: '',
                render: (row) =>
                  row.paymentStatus === 'awaiting' ||
                  (row.paymentStatus !== 'paid' && !row.logisticsBookingRef) ? (
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={payingId === row.id}
                      onClick={() => confirmPay(row)}
                    >
                      {payingId === row.id ? 'Paying…' : 'Mock pay & book'}
                    </button>
                  ) : (
                    <StatusBadge status="paid" />
                  ),
              },
            ]}
            rows={marketplaceBookings}
          />
        )}
      </Card>

      {/* Shortcodes */}
      <Card className="p-5">
        <SectionHeader
          icon={Code2}
          title="Tracking shortcode & embed"
          description="Paste into Woo pages, Lovable, or any site. Replace the booking code with a real one."
        />
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-muted">WordPress-style shortcode</p>
            <pre className="overflow-x-auto rounded-xl bg-ink p-3 font-mono text-xs text-white">{shortcodeSnippet}</pre>
            <button type="button" className={`${btnGhost} mt-2`} onClick={() => copyText('sc', shortcodeSnippet)}>
              {copied === 'sc' ? <Check size={12} /> : <Copy size={12} />} Copy shortcode
            </button>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-muted">HTML iframe embed</p>
            <pre className="overflow-x-auto rounded-xl bg-ink p-3 font-mono text-xs text-white">{iframeSnippet}</pre>
            <button type="button" className={`${btnGhost} mt-2`} onClick={() => copyText('iframe', iframeSnippet)}>
              {copied === 'iframe' ? <Check size={12} /> : <Copy size={12} />} Copy iframe
            </button>
          </div>
          <p className="text-sm text-muted">
            Preview widget:{' '}
            <a className="font-semibold text-brand underline" href={`/embed/track?code=${sampleCode}`} target="_blank" rel="noreferrer">
              /embed/track?code={sampleCode}
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}
