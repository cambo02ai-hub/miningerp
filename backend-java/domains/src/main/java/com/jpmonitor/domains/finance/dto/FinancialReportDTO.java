package com.jpmonitor.domains.finance.dto;

import java.math.BigDecimal;

public record FinancialReportDTO(
    BigDecimal totalRevenue,
    BigDecimal costOfGoodsSold,
    BigDecimal grossProfit,
    BigDecimal operatingExpenses,
    BigDecimal netProfit,
    BigDecimal totalAssets,
    BigDecimal totalLiabilities,
    BigDecimal equity
) {}
