const {
  courierStatusToStage,
  displayShipmentStatus,
  displayShipmentLabel,
  progressTimeline,
} = require('../../../src/integrations/utils/shipmentProgress');

describe('shipmentProgress', () => {
  test('maps Courier Guy collection-assigned to booked, not in transit', () => {
    expect(courierStatusToStage('collection-assigned')).toBe('booked');
    expect(courierStatusToStage('Collection assigned')).toBe('booked');
    expect(courierStatusToStage('in-transit')).toBe('in_transit');
    expect(courierStatusToStage('collected')).toBe('warehouse');
    expect(courierStatusToStage('label-created')).toBe('booked');
    expect(courierStatusToStage('PU')).toBe('warehouse');
    expect(courierStatusToStage('IT')).toBe('in_transit');
    expect(courierStatusToStage('OD')).toBe('out_for_delivery');
    expect(courierStatusToStage('DL')).toBe('delivered');
    expect(courierStatusToStage('pending')).toBe('booked');
    expect(courierStatusToStage('pickup_complete')).toBe('warehouse');
    expect(courierStatusToStage('EN_ROUTE_TO_DROPOFF')).toBe('out_for_delivery');
    expect(courierStatusToStage('completed')).toBe('delivered');
  });

  test('display uses courier status over a stale in_transit booking flag', () => {
    const row = {
      status: 'in_transit',
      logisticsBookingRef: '128319326',
      trackingNumber: 'V83RLM',
      courierStatus: 'collection-assigned',
      timeline: [{ stage: 'booked', done: true }, { stage: 'warehouse', done: false }, { stage: 'in_transit', done: false }],
    };
    expect(displayShipmentStatus(row)).toBe('booked');
    expect(displayShipmentLabel(row)).toBe('collection assigned');
    expect(progressTimeline(row.timeline, displayShipmentStatus(row)).filter((s) => s.done).map((s) => s.stage)).toEqual([
      'booked',
    ]);
  });
});
