package com.jpmonitor.api.controller;

import com.jpmonitor.domains.finance.dto.*;
import com.jpmonitor.domains.finance.entity.BudgetPlan;
import com.jpmonitor.domains.finance.entity.MiningRoyalty;
import com.jpmonitor.domains.finance.entity.SalesInvoice;
import com.jpmonitor.domains.finance.service.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    // 1. Sales Invoices (Accounts Receivable)
    @GetMapping("/sales-invoices")
    public ResponseEntity<List<SalesInvoice>> getSalesInvoices() {
        return ResponseEntity.ok(financeService.getAllSalesInvoices());
    }

    @PostMapping("/sales-invoices")
    public ResponseEntity<SalesInvoice> createSalesInvoice(@RequestBody SalesInvoice invoice) {
        return ResponseEntity.ok(financeService.createSalesInvoice(invoice));
    }

    // 2. Cost Per Ton Analytics (CPT)
    @GetMapping("/cost-per-ton")
    public ResponseEntity<CostPerTonDTO> getCostPerTon() {
        return ResponseEntity.ok(financeService.getCostPerTonAnalytics());
    }

    // 3. Hours-based Equipment Depreciation
    @GetMapping("/equipment-depreciation")
    public ResponseEntity<List<EquipmentDepreciationDTO>> getEquipmentDepreciation() {
        return ResponseEntity.ok(financeService.getEquipmentDepreciationReport());
    }

    // 4. Mining Royalty & Tax Management
    @GetMapping("/royalties")
    public ResponseEntity<List<MiningRoyalty>> getRoyalties() {
        return ResponseEntity.ok(financeService.getAllMiningRoyalties());
    }

    @PostMapping("/royalties")
    public ResponseEntity<MiningRoyalty> createRoyalty(@RequestBody MiningRoyalty royalty) {
        return ResponseEntity.ok(financeService.createMiningRoyalty(royalty));
    }

    // 5. Budgeting & Variance Analysis
    @GetMapping("/budget-variance")
    public ResponseEntity<List<BudgetVarianceDTO>> getBudgetVariance(@RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(financeService.getBudgetVarianceReport(year != null ? year : 2025));
    }

    @PostMapping("/budget-plans")
    public ResponseEntity<BudgetPlan> createBudgetPlan(@RequestBody BudgetPlan plan) {
        return ResponseEntity.ok(financeService.createBudgetPlan(plan));
    }

    // 6. Cash Flow Forecast
    @GetMapping("/cashflow-forecast")
    public ResponseEntity<List<CashFlowForecastDTO>> getCashFlowForecast() {
        return ResponseEntity.ok(financeService.getCashFlowForecast());
    }

    // 7. General Ledger & Financial Report
    @GetMapping("/financial-report")
    public ResponseEntity<FinancialReportDTO> getFinancialReport() {
        return ResponseEntity.ok(financeService.getFinancialReport());
    }
}
