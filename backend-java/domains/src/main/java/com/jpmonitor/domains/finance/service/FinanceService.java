package com.jpmonitor.domains.finance.service;

import com.jpmonitor.domains.finance.dto.*;
import com.jpmonitor.domains.finance.entity.BudgetPlan;
import com.jpmonitor.domains.finance.entity.MiningRoyalty;
import com.jpmonitor.domains.finance.entity.SalesInvoice;

import java.util.List;

public interface FinanceService {
    // 1. Sales Invoices (AR)
    List<SalesInvoice> getAllSalesInvoices();
    SalesInvoice createSalesInvoice(SalesInvoice invoice);

    // 2. Cost Per Ton (CPT)
    CostPerTonDTO getCostPerTonAnalytics();

    // 3. Equipment Hours-based Depreciation
    List<EquipmentDepreciationDTO> getEquipmentDepreciationReport();

    // 4. Mining Royalty & Tax
    List<MiningRoyalty> getAllMiningRoyalties();
    MiningRoyalty createMiningRoyalty(MiningRoyalty royalty);

    // 5. Budgeting & Variance
    List<BudgetVarianceDTO> getBudgetVarianceReport(Integer year);
    BudgetPlan createBudgetPlan(BudgetPlan plan);

    // 6. Cash Flow Forecast
    List<CashFlowForecastDTO> getCashFlowForecast();

    // 7. General Ledger & P&L Report
    FinancialReportDTO getFinancialReport();
}
