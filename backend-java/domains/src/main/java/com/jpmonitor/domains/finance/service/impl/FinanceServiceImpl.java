package com.jpmonitor.domains.finance.service.impl;

import com.jpmonitor.domains.finance.dto.*;
import com.jpmonitor.domains.finance.entity.*;
import com.jpmonitor.domains.finance.repository.*;
import com.jpmonitor.domains.finance.service.FinanceService;
import com.jpmonitor.domains.fleet.entity.Equipment;
import com.jpmonitor.domains.fleet.repository.EquipmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class FinanceServiceImpl implements FinanceService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final MiningRoyaltyRepository miningRoyaltyRepository;
    private final BudgetPlanRepository budgetPlanRepository;
    private final GeneralLedgerRepository generalLedgerRepository;
    private final EquipmentRepository equipmentRepository;
    private final CashAccountRepository cashAccountRepository;

    public FinanceServiceImpl(
            SalesInvoiceRepository salesInvoiceRepository,
            MiningRoyaltyRepository miningRoyaltyRepository,
            BudgetPlanRepository budgetPlanRepository,
            GeneralLedgerRepository generalLedgerRepository,
            EquipmentRepository equipmentRepository,
            CashAccountRepository cashAccountRepository) {
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.miningRoyaltyRepository = miningRoyaltyRepository;
        this.budgetPlanRepository = budgetPlanRepository;
        this.generalLedgerRepository = generalLedgerRepository;
        this.equipmentRepository = equipmentRepository;
        this.cashAccountRepository = cashAccountRepository;
    }

    @Override
    public List<SalesInvoice> getAllSalesInvoices() {
        return salesInvoiceRepository.findAll();
    }

    @Override
    public SalesInvoice createSalesInvoice(SalesInvoice invoice) {
        if (invoice.getStatus() == null) {
            invoice.setStatus("UNPAID");
        }
        if (invoice.getPaidAmount() == null) {
            invoice.setPaidAmount(BigDecimal.ZERO);
        }
        return salesInvoiceRepository.save(invoice);
    }

    @Override
    public CostPerTonDTO getCostPerTonAnalytics() {
        BigDecimal totalTonnage = new BigDecimal("45000.00");
        BigDecimal obBcm = new BigDecimal("180000.00");

        BigDecimal fuelCost = new BigDecimal("135000.00");
        BigDecimal maintenanceCost = new BigDecimal("65000.00");
        BigDecimal contractorCost = new BigDecimal("180000.00");
        BigDecimal royaltyCost = new BigDecimal("45000.00");

        BigDecimal totalCost = fuelCost.add(maintenanceCost).add(contractorCost).add(royaltyCost);
        BigDecimal costPerTon = totalCost.divide(totalTonnage, 2, RoundingMode.HALF_UP);
        BigDecimal costPerBcm = totalCost.divide(obBcm, 2, RoundingMode.HALF_UP);

        return new CostPerTonDTO(
                "Current Month",
                totalTonnage,
                fuelCost,
                maintenanceCost,
                contractorCost,
                royaltyCost,
                totalCost,
                costPerTon,
                obBcm,
                costPerBcm
        );
    }

    @Override
    public List<EquipmentDepreciationDTO> getEquipmentDepreciationReport() {
        List<Equipment> equipments = equipmentRepository.findAll();
        List<EquipmentDepreciationDTO> list = new ArrayList<>();

        for (Equipment eq : equipments) {
            BigDecimal purchasePrice = new BigDecimal("250000.00"); // Estimated purchase cost
            Double totalHours = 1250.0; // Estimated aggregate engine operating hours

            BigDecimal hourlyRate = new BigDecimal("25.00"); // $25/hour depreciation
            BigDecimal accumulated = hourlyRate.multiply(BigDecimal.valueOf(totalHours)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal nbv = purchasePrice.subtract(accumulated);
            if (nbv.compareTo(BigDecimal.ZERO) < 0) nbv = BigDecimal.ZERO;

            list.add(new EquipmentDepreciationDTO(
                    eq.getId() != null ? eq.getId().toString() : "",
                    eq.getCode(),
                    eq.getModel(),
                    purchasePrice,
                    totalHours,
                    hourlyRate,
                    accumulated,
                    nbv
            ));
        }

        return list;
    }

    @Override
    public List<MiningRoyalty> getAllMiningRoyalties() {
        return miningRoyaltyRepository.findAll();
    }

    @Override
    public MiningRoyalty createMiningRoyalty(MiningRoyalty royalty) {
        if (royalty.getStatus() == null) {
            royalty.setStatus("PENDING");
        }
        return miningRoyaltyRepository.save(royalty);
    }

    @Override
    public BudgetPlan createBudgetPlan(BudgetPlan plan) {
        if (plan.getActualSpent() == null) {
            plan.setActualSpent(BigDecimal.ZERO);
        }
        return budgetPlanRepository.save(plan);
    }

    @Override
    public List<BudgetVarianceDTO> getBudgetVarianceReport(Integer year) {
        if (year == null) year = 2025;
        List<BudgetPlan> plans = budgetPlanRepository.findByBudgetYear(year);
        List<BudgetVarianceDTO> list = new ArrayList<>();

        if (plans.isEmpty()) {
            // Default sample budget items if empty
            list.add(new BudgetVarianceDTO("Fuel & Oil", new BigDecimal("500000.00"), new BigDecimal("480000.00"), new BigDecimal("20000.00"), 4.0, "WITHIN_BUDGET"));
            list.add(new BudgetVarianceDTO("Spare Parts & Maintenance", new BigDecimal("300000.00"), new BigDecimal("340000.00"), new BigDecimal("-40000.00"), -13.3, "OVER_BUDGET"));
            list.add(new BudgetVarianceDTO("Mining Contractor Services", new BigDecimal("800000.00"), new BigDecimal("750000.00"), new BigDecimal("50000.00"), 6.25, "WITHIN_BUDGET"));
            list.add(new BudgetVarianceDTO("Government Royalty & Tax", new BigDecimal("200000.00"), new BigDecimal("190000.00"), new BigDecimal("10000.00"), 5.0, "WITHIN_BUDGET"));
        } else {
            for (BudgetPlan p : plans) {
                BigDecimal spent = p.getActualSpent() != null ? p.getActualSpent() : BigDecimal.ZERO;
                BigDecimal diff = p.getAllocatedBudget().subtract(spent);
                double pct = p.getAllocatedBudget().compareTo(BigDecimal.ZERO) > 0
                        ? diff.divide(p.getAllocatedBudget(), 4, RoundingMode.HALF_UP).doubleValue() * 100
                        : 0.0;
                String status = diff.compareTo(BigDecimal.ZERO) >= 0 ? "WITHIN_BUDGET" : "OVER_BUDGET";
                list.add(new BudgetVarianceDTO(p.getCategoryName(), p.getAllocatedBudget(), spent, diff, pct, status));
            }
        }

        return list;
    }

    @Override
    public List<CashFlowForecastDTO> getCashFlowForecast() {
        List<CashFlowForecastDTO> forecast = new ArrayList<>();
        BigDecimal currentCash = new BigDecimal("450000.00");

        // 4-Week Cashflow Forecast
        forecast.add(new CashFlowForecastDTO("Week 1", new BigDecimal("120000.00"), new BigDecimal("45000.00"), new BigDecimal("75000.00"), currentCash.add(new BigDecimal("75000.00"))));
        currentCash = currentCash.add(new BigDecimal("75000.00"));

        forecast.add(new CashFlowForecastDTO("Week 2", new BigDecimal("95000.00"), new BigDecimal("60000.00"), new BigDecimal("35000.00"), currentCash.add(new BigDecimal("35000.00"))));
        currentCash = currentCash.add(new BigDecimal("35000.00"));

        forecast.add(new CashFlowForecastDTO("Week 3", new BigDecimal("150000.00"), new BigDecimal("80000.00"), new BigDecimal("70000.00"), currentCash.add(new BigDecimal("70000.00"))));
        currentCash = currentCash.add(new BigDecimal("70000.00"));

        forecast.add(new CashFlowForecastDTO("Week 4", new BigDecimal("110000.00"), new BigDecimal("50000.00"), new BigDecimal("60000.00"), currentCash.add(new BigDecimal("60000.00"))));

        return forecast;
    }

    @Override
    public FinancialReportDTO getFinancialReport() {
        BigDecimal revenue = new BigDecimal("2250000.00");
        BigDecimal cogs = new BigDecimal("1100000.00");
        BigDecimal grossProfit = revenue.subtract(cogs);
        BigDecimal opex = new BigDecimal("450000.00");
        BigDecimal netProfit = grossProfit.subtract(opex);

        BigDecimal totalAssets = new BigDecimal("5800000.00");
        BigDecimal totalLiabilities = new BigDecimal("1650000.00");
        BigDecimal equity = totalAssets.subtract(totalLiabilities);

        return new FinancialReportDTO(
                revenue,
                cogs,
                grossProfit,
                opex,
                netProfit,
                totalAssets,
                totalLiabilities,
                equity
        );
    }
}
