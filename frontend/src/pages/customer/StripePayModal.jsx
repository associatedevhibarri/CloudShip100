import { Component, useEffect, useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const TEST_CARD = '4242 4242 4242 4242'

class StripeSafe extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <p className="text-sm text-red-600">
          Stripe payment form failed to load. Close this and try Pay again.
        </p>
      )
    }
    return this.props.children
  }
}

function PayForm({ amount, currency, onCancel, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [booking, setBooking] = useState(false)
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
    if (!stripe || !elements || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/customer/ecommerce?tab=orders`,
        },
        redirect: 'if_required',
      })
      if (stripeError) {
        setBusy(false)
        setError(stripeError.message || 'Card was declined')
        return
      }
      setBooking(true)
      await onPaid()
    } catch (err) {
      setBooking(false)
      setBusy(false)
      setError(err.message || 'Payment failed. Try again.')
    }
  }

  if (booking) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm font-semibold text-ink">Card paid. Booking the courier…</p>
        <p className="text-xs text-muted">Keep this window open until the waybill is created.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        <p className="text-sm text-muted">
          Pay {currency} {Number(amount).toFixed(2)} to CloudShip with Stripe test mode. The courier is booked after this
          succeeds.
        </p>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <p className="font-bold">Stripe test card</p>
          <p className="mt-1 font-mono text-sm">{TEST_CARD}</p>
          <p className="mt-1">Expiry: any future date · CVC: any 3 digits · Country: South Africa · ZIP: 7741</p>
          <button type="button" className="mt-2 font-semibold text-brand underline" onClick={copyCard}>
            {copied ? 'Copied' : 'Copy card number'}
          </button>
        </div>
        <StripeSafe>
          <PaymentElement
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card'],
              wallets: { applePay: 'never', googlePay: 'never' },
              defaultValues: {
                billingDetails: {
                  name: 'Test Customer',
                  address: { country: 'ZA', postal_code: '7741' },
                },
              },
            }}
          />
        </StripeSafe>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-line pt-3">
        <button
          type="button"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || busy}
          className="inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Paying…
            </>
          ) : (
            'Pay with test card'
          )}
        </button>
      </div>
    </form>
  )
}

export function StripePayModal({ clientSecret, publishableKey, amount, currency, onClose, onPaid }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])
  if (!clientSecret || !publishableKey) return null

  return (
    <ModalFrame>
      <h3 id="stripe-pay-title" className="mb-3 shrink-0 text-lg font-extrabold text-ink">
        Stripe test pay
      </h3>
      <div className="flex min-h-0 flex-1 flex-col">
        <StripeSafe>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PayForm amount={amount} currency={currency} onCancel={onClose} onPaid={onPaid} />
          </Elements>
        </StripeSafe>
      </div>
    </ModalFrame>
  )
}

function ModalFrame({ children }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
      <div
        className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stripe-pay-title"
      >
        {children}
      </div>
    </div>
  )
}
