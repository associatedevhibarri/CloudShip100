import { useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const TEST_CARD = '4242 4242 4242 4242'

function PayForm({ amount, currency, onCancel, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText('4242424242424242')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setError('')
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/customer/ecommerce?tab=orders`,
      },
      redirect: 'if_required',
    })
    setBusy(false)
    if (stripeError) {
      setError(stripeError.message || 'Card was declined')
      return
    }
    onPaid()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted">
        Pay {currency} {Number(amount).toFixed(2)} to CloudShip with Stripe test mode. The courier is booked after this
        succeeds.
      </p>
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
        <p className="font-bold">Stripe test card</p>
        <p className="mt-1 font-mono text-sm">{TEST_CARD}</p>
        <p className="mt-1">Expiry: any future date · CVC: any 3 digits · ZIP: any</p>
        <button type="button" className="mt-2 font-semibold text-brand underline" onClick={copyCard}>
          {copied ? 'Copied' : 'Copy card number'}
        </button>
      </div>
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
          wallets: { applePay: 'never', googlePay: 'never' },
          defaultValues: { billingDetails: { address: { country: 'ZA' } } },
        }}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm font-semibold" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || busy}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Paying…' : 'Pay with test card'}
        </button>
      </div>
    </form>
  )
}

export function StripePayModal({ clientSecret, publishableKey, amount, currency, onClose, onPaid }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  if (!clientSecret || !publishableKey) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-lg font-extrabold text-ink">Stripe test pay</h3>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
          <PayForm amount={amount} currency={currency} onCancel={onClose} onPaid={onPaid} />
        </Elements>
      </div>
    </div>
  )
}
