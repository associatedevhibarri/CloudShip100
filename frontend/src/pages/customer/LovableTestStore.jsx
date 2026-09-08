import React, { useState } from 'react';
import { CloudShip } from '../../utils/cloudshipLovableSdk';

/**
 * Senior Production-Ready Lovable Testing Component
 * Can be dropped into any Lovable site to test rates & order ingestion live.
 */
export default function LovableTestStore() {
  const [apiKey, setApiKey] = useState(
    process.env.VITE_CLOUDSHIP_API_KEY || 'cs_live_1f53d47ace6289885626e5171964c79ddf9369ce6fe84530'
  );
  const [baseUrl, setBaseUrl] = useState(
    process.env.VITE_CLOUDSHIP_API_URL || 'https://trailing-rubbing-kung.ngrok-free.dev'
  );

  const [pickup, setPickup] = useState('Cape Town Warehouse');
  const [dropoff, setDropoff] = useState('123 Sandton City, Johannesburg');
  const [weightKg, setWeightKg] = useState('2.5');
  const [buyerEmail, setBuyerEmail] = useState('customer@example.com');
  const [cargo, setCargo] = useState('Lovable Test Product');

  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesResult, setRatesResult] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);

  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [error, setError] = useState(null);

  // Initialize SDK dynamically
  const getSdk = () => new CloudShip({ apiKey, baseUrl });

  const handleFetchRates = async (e) => {
    e.preventDefault();
    setLoadingRates(true);
    setError(null);
    setRatesResult(null);
    setSelectedRate(null);

    try {
      const sdk = getSdk();
      const result = await sdk.getShippingRates({
        pickup,
        dropoff,
        weightKg: Number(weightKg),
      });
      setRatesResult(result);
      if (result.options && result.options.length > 0) {
        setSelectedRate(result.options[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRates(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setSubmittingOrder(true);
    setError(null);
    setOrderResult(null);

    try {
      const sdk = getSdk();
      const externalOrderId = `LOV-ORDER-${Math.floor(100000 + Math.random() * 900000)}`;
      const result = await sdk.createOrder({
        externalOrderId,
        buyerEmail,
        pickup,
        dropoff,
        weightKg: Number(weightKg),
        cargo,
        currency: 'ZAR',
      });
      setOrderResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f8fafc', borderRadius: '16px', border: '1px solid #334155' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>
        🚀 Lovable E-Commerce Integration Tester
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
        Test live courier quote fetching and order ingestion directly from your Lovable site.
      </p>

      {/* Configuration Section */}
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>⚙️ SDK Credentials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>PUBLIC API KEY</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>API BASE URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

      {/* Step 1: Rates */}
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>1️⃣ Calculate Live Shipping Rates</h3>
        <form onSubmit={handleFetchRates} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>PICKUP</label>
            <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>DROPOFF</label>
            <input type="text" value={dropoff} onChange={(e) => setDropoff(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>WEIGHT (KG)</label>
            <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={loadingRates} style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              {loadingRates ? 'Fetching Rates...' : 'Get Live Rates'}
            </button>
          </div>
        </form>

        {ratesResult && (
          <div style={{ marginTop: '16px', background: '#0f172a', padding: '12px', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px' }}>Available Carriers:</p>
            {ratesResult.options?.map((opt, idx) => (
              <div key={idx} onClick={() => setSelectedRate(opt)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', marginBottom: '6px', borderRadius: '6px', background: selectedRate === opt ? '#1e3a8a' : '#1e293b', border: selectedRate === opt ? '1px solid #3b82f6' : '1px solid #334155', cursor: 'pointer', fontSize: '12px' }}>
                <span><strong>{opt.partner}</strong> ({opt.service}) - ETA ~{opt.etaHours}h</span>
                <span style={{ color: '#4ade80', fontWeight: 'bold' }}>R {opt.quotedPrice}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Checkout Order */}
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>2️⃣ Submit Checkout Order</h3>
        <form onSubmit={handlePlaceOrder} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>BUYER EMAIL</label>
            <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>CARGO DESCRIPTION</label>
            <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={submittingOrder} style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              {submittingOrder ? 'Submitting Order...' : 'Complete Checkout'}
            </button>
          </div>
        </form>

        {orderResult && (
          <div style={{ marginTop: '16px', background: '#064e3b', color: '#6ee7b7', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
            <p style={{ fontWeight: 'bold' }}>✅ Order Ingested Successfully!</p>
            <p>Booking Code: <strong>{orderResult.bookingCode}</strong></p>
            <p>Booking ID: {orderResult.bookingId}</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '16px', background: '#7f1d1d', color: '#fca5a5', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}
