import { beforeEach, describe, expect, it } from 'vitest';
import { contractorMiningAPI } from '../services/contractorMining';

const WORKFLOW_KEY = 'jpmonitor_contractor_mining_workflow';

describe('Contractor Mining workflow service', () => {
  beforeEach(() => {
    window.localStorage.removeItem(WORKFLOW_KEY);
  });

  it('creates a submitted daily report linked to the assignment reference ID', async () => {
    const next = await contractorMiningAPI.createDailyReport({
      assignmentId: 'assignment-01',
      date: '2026-08-29',
      shift: 'Day',
      quantityMt: 125,
      trips: 8,
      equipmentHours: 24,
      supervisor: 'U Test Supervisor',
      notes: 'Checkpoint verified.',
    });

    expect(next.dailyReports[0]).toMatchObject({
      referenceId: 'REF-2026-08-001',
      quantityMt: 125,
      status: 'SUBMITTED',
      hsePassed: true,
    });
  });

  it('blocks daily reports and haulage for a suspended assignment', async () => {
    await expect(contractorMiningAPI.createDailyReport({
      assignmentId: 'assignment-02',
      date: '2026-08-29',
      shift: 'Day',
      quantityMt: 100,
      trips: 5,
      equipmentHours: 10,
      supervisor: 'U Test Supervisor',
      notes: '',
    })).rejects.toThrow('Suspended or closed assignments cannot receive daily reports.');

    await expect(contractorMiningAPI.createReceipt({
      assignmentId: 'assignment-02',
      date: '2026-08-29',
      truckNo: '9H-TEST',
      grossWeightMt: 30,
      tareWeightMt: 10,
      destination: 'Company Stockpile B',
    })).rejects.toThrow('Suspended or closed assignments cannot dispatch haulage.');
  });

  it('rejects invalid weighbridge measurements and calculates eligible settlement share', async () => {
    await expect(contractorMiningAPI.createReceipt({
      assignmentId: 'assignment-01',
      date: '2026-08-29',
      truckNo: '9H-TEST',
      grossWeightMt: 10,
      tareWeightMt: 10,
      destination: 'Company Stockpile A',
    })).rejects.toThrow('Gross weight must be greater than tare weight.');

    const next = await contractorMiningAPI.calculateSettlement('contract-01');
    const settlement = next.settlements.find(item => item.contractId === 'contract-01');
    expect(settlement).toMatchObject({
      receivedQuantityMt: 22.5,
      companyShareMt: 7.5,
      contractorShareMt: 15,
      deductionsMt: 0.75,
      payableAmount: 2565000,
      status: 'CALCULATED',
    });
  });
});
