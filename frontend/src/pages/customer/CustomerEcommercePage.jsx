import { useEffect, useMemo, useState } from 'react'
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
import { ShopCheckoutSettings } from './ShopCheckoutSettings'
import { StripePayModal } from './StripePayModal'
import { MarketplaceOrders } from './MarketplaceOrders'

const PLATFORMS = [
  {
    id: 'woocommerce',
    label: 'WooCommerce',
    hint: 'Free REST API + Webhooks. Works on local WordPress or production site.',
    docsUrl: null,
    steps: [
      'WordPress Admin → WooCommerce → Settings → Advanced → REST API → Add key (Permissions: Read/Write).',
      'Copy Consumer key (ck_…) and Consumer secret (cs_…) into the form below.',
      'Enter Store URL (e.g. http://woocommerse.local) and click Connect to get your Connection ID.',
      'Go to WooCommerce → Settings → Advanced → Webhooks → Add Webhook.',
      'Set Topic: Order created | Delivery URL: https://<NGROK_OR_DOMAIN>/v1/webhooks/woocommerce/orders?connectionId=<CONNECTION_ID>',
      'Status: Active | API Version: WP REST API Integration v3 → Save Webhook.',
    ],
    fieldsNeeded: 'Store URL + Consumer key + Consumer secret + Pickup address',
  },
  {
    id: 'shopify',
    label: 'Shopify',
    hint: 'Connect via Custom App Admin API or Webhook Notifications.',
    docsUrl: 'https://partners.shopify.com',
    steps: [
      'Shopify Admin → Settings → Apps & sales channels → Develop apps → Create an app.',
      'Configure Admin API scopes: read_orders, write_orders, read_shipping, write_shipping, write_fulfillments.',
      'Click Save → Install App → Reveal Admin API access token (shpat_…).',
      'Paste shop domain (mystore.myshopify.com) + access token below and click Connect.',
      'Go to Shopify Admin → Settings → Notifications → Webhooks → Create Webhook.',
      'Event: Order creation | Format: JSON | URL: https://<NGROK_OR_DOMAIN>/v1/webhooks/shopify/orders?connectionId=<CONNECTION_ID>',
    ],
    fieldsNeeded: 'Shop domain + Access token (shpat_…) + Pickup address',
  },
  {
    id: 'wix',
    label: 'Wix',
    hint: 'Connect via Wix Dev Center App & Extensions.',
    docsUrl: 'https://dev.wix.com',
    steps: [
      'Wix Dev Center → Create App → Grant Permissions: Orders (Read), eCommerce Fulfillments (Read/Write), Shipping Rates (Read/Write).',
      'In Wix Dev App → Webhooks → Add Webhook → Wix Stores → Order Created.',
      'Callback URL: https://<NGROK_OR_DOMAIN>/v1/webhooks/wix/orders?connectionId=<CONNECTION_ID>',
      'In Wix Dev App → Extensions → Ecom Shipping Rates → Set Base URI: https://<NGROK_OR_DOMAIN>/v1/webhooks/wix/rates?connectionId=<CONNECTION_ID>',
      'Install app on your dev site, then paste access token and pickup address below to connect.',
    ],
    fieldsNeeded: 'Access token + Pickup address',
  },
  {
    id: 'lovable',
    label: 'Lovable / Universal',
    hint: 'No external keys required. CloudShip generates a Public API Key upon connection.',
    docsUrl: null,
    steps: [
      'Enter Store Name + Pickup Address below and click Connect.',
      'Copy your generated publicApiKey (cs_live_…) and webhookSecret (shown once).',
      'Set VITE_CLOUDSHIP_API_KEY=cs_live_... and VITE_CLOUDSHIP_API_URL=https://<NGROK_OR_DOMAIN> in your .env file.',
      'In your Lovable site: POST /v1/webhooks/lovable/rates (for checkout quotes) & POST /v1/webhooks/lovable/orders (for order placement).',
      'Pass header: x-cloudship-key: <YOUR_PUBLIC_API_KEY>.',
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
  const [payConfig, setPayConfig] = useState({ mode: 'mock', ready: true, publishableKey: '' })
  const [stripeCheckout, setStripeCheckout] = useState(null)

  useEffect(() => {
    if (!token) return undefined
    portalService.getPaymentConfig(token).then(setPayConfig).catch(() => {})
    const params = new URLSearchParams(window.location.search)
    const intent = params.get('payment_intent')
    if (!intent) return undefined
    let cancelled = false
    portalService
      .confirmMarketplacePayment(token, intent)
      .then(() => {
        if (cancelled) return
        toast.success('Card paid. Courier booked. We emailed the shop and the buyer.')
        refetchBookings()
        window.history.replaceState({}, '', window.location.pathname)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

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

  const confirmPay = async (booking, selection) => {
    setPayingId(booking.id)
    try {
      const payment = await portalService.createMarketplacePayment(token, booking.id, selection)
      if (payment.mode === 'stripe') {
        if (payment.status === 'paid') {
          await portalService.confirmMarketplacePayment(token, payment.paymentIntentId)
          toast.success('Payment confirmed. Courier booked. We emailed the shop and the buyer.')
          refetchBookings()
          return
        }
        if (!payment.clientSecret || !(payment.publishableKey || payConfig.publishableKey)) {
          toast.error('Stripe is on but STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY is missing')
          return
        }
        setStripeCheckout({
          paymentIntentId: payment.paymentIntentId,
          clientSecret: payment.clientSecret,
          publishableKey: payment.publishableKey || payConfig.publishableKey,
          amount: payment.amount,
          currency: payment.currency,
        })
        return
      }
      await portalService.confirmMarketplacePayment(token, payment.paymentIntentId)
      toast.success('Payment confirmed. Courier booked. We emailed the shop and the buyer.')
      refetchBookings()
    } catch (err) {
      toast.error(err.message || 'Payment confirm failed')
    } finally {
      setPayingId(null)
    }
  }

  const finishStripePay = async () => {
    if (!stripeCheckout) return
    try {
      await portalService.confirmMarketplacePayment(token, stripeCheckout.paymentIntentId)
      toast.success('Card paid. Courier booked. We emailed the shop and the buyer.')
      refetchBookings()
    } catch (err) {
      toast.error(err.message || 'Paid but the courier book failed. Refresh or retry.')
    } finally {
      setStripeCheckout(null)
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
        subtitle="Connect your shop, set pickup and pricing rules, then live courier rates appear at checkout."
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

      <ShopCheckoutSettings stores={storeList} token={token} toast={toast} onSaved={refetchStores} />

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
          description="Live courier price + CloudShip 10% + your extra %. Table rates show when they match."
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
                  <th className="px-3 py-2">CloudShip</th>
                  <th className="px-3 py-2">Your cut</th>
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
                    <td className="px-3 py-2">R {opt.shopMarginAmount || 0}</td>
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
          description="Orders from connected shops. Open a row to see live courier rates, pick one, then pay. CloudShip books that courier and emails both sides."
        />
        {payConfig.mode === 'stripe' && !payConfig.ready ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            PAYMENT_MODE is stripe. Paste STRIPE_SECRET_KEY (sk_test_…) and STRIPE_PUBLISHABLE_KEY (pk_test_…) in
            backend .env, then restart the backend. Use test card 4242 4242 4242 4242.
          </p>
        ) : null}
        {marketplaceBookings.length === 0 ? (
          <p className="text-sm text-muted">
            No shop orders yet. Create one via Postman webhook or wait for a real Woo order webhook.
          </p>
        ) : (
          <MarketplaceOrders
            rows={marketplaceBookings}
            token={token}
            payingId={payingId}
            payConfig={payConfig}
            payLabel={
              payConfig.mode === 'stripe'
                ? payConfig.ready
                  ? 'Pay with test card'
                  : 'Stripe keys missing'
                : 'Mock pay & book'
            }
            onPay={confirmPay}
          />
        )}
      </Card>

      {/* Shortcodes */}
      <Card className="p-5">
        <SectionHeader
          icon={Code2}
          title="Tracking shortcode & embed"
          description="Paste the tracking shortcode on a thank-you page. Checkout rates come from the CloudShip Woo shipping plugin, not this snippet."
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
      {stripeCheckout ? (
        <StripePayModal
          clientSecret={stripeCheckout.clientSecret}
          publishableKey={stripeCheckout.publishableKey}
          amount={stripeCheckout.amount}
          currency={stripeCheckout.currency}
          onClose={() => setStripeCheckout(null)}
          onPaid={finishStripePay}
        />
      ) : null}
    </div>
  )
}
