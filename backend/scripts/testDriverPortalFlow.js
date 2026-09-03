/* eslint-disable no-console */
const BASE = process.env.API_BASE || 'http://localhost:3000/v1';

const request = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
};

const stamp = Date.now();
const password = 'Test1234';

const main = async () => {
  const operator = await request('POST', '/auth/register', {
    body: {
      name: 'E2E Operator',
      email: `e2e.ops.${stamp}@example.com`,
      password,
      role: 'operator',
    },
  });
  const driver = await request('POST', '/auth/register', {
    body: {
      name: 'E2E Driver',
      email: `e2e.drv.${stamp}@example.com`,
      password,
      role: 'driver',
    },
  });

  const opsToken = operator.tokens.access.token;
  const drvToken = driver.tokens.access.token;

  const profile = await request('GET', '/drivers/me/profile', { token: drvToken });
  const employeeId = profile.employeeId;
  if (!employeeId) throw new Error('Driver employeeId missing');

  const snapshot = await request('GET', '/warehouse', { token: opsToken });
  let parcel = (snapshot.parcels || []).find((p) => !p.fleetType && p.status !== 'expected' && p.status !== 'dispatched');
  if (!parcel) {
    const expected = (snapshot.parcels || []).find((p) => p.status === 'expected');
    if (!expected) throw new Error('No warehouse parcel available to assign');
    parcel = await request('POST', `/warehouse/parcels/${expected.id}/receive`, { token: opsToken });
  }

  const assigned = await request('POST', `/warehouse/parcels/${parcel.id}/assign`, {
    token: opsToken,
    body: { employeeId },
  });
  if (assigned.driverEmployeeId !== employeeId) {
    throw new Error(`Assign failed: expected ${employeeId}, got ${assigned.driverEmployeeId}`);
  }

  let parcels = await request('GET', '/drivers/me/parcels', { token: drvToken });
  const mine = parcels.find((p) => p.id === parcel.id);
  if (!mine) throw new Error(`Driver parcels missing assigned parcel ${parcel.id}`);
  if (mine.status !== 'assigned') throw new Error(`Expected assigned, got ${mine.status}`);

  for (const status of ['picked_up', 'in_transit', 'delivered']) {
    await request('PATCH', `/drivers/me/parcels/${parcel.id}/status`, {
      token: drvToken,
      body: { status },
    });
  }

  parcels = await request('GET', '/drivers/me/parcels', { token: drvToken });
  const delivered = parcels.find((p) => p.id === parcel.id);
  if (!delivered || delivered.status !== 'delivered') {
    throw new Error('Driver status update to delivered failed');
  }

  const dashboard = await request('GET', '/drivers/me/dashboard', { token: drvToken });
  const hasDemo = (dashboard.parcels || []).some((p) => ['PRATIK1', 'DEEPAK2', 'PKG-8803'].includes(p.id));
  if (hasDemo) throw new Error('Demo seed parcels still present on driver dashboard');

  console.log(
    JSON.stringify(
      {
        ok: true,
        employeeId,
        parcelId: parcel.id,
        finalStatus: delivered.status,
        tripCount: (dashboard.trips || []).length,
        parcelCount: (dashboard.parcels || []).length,
      },
      null,
      2
    )
  );
};

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
