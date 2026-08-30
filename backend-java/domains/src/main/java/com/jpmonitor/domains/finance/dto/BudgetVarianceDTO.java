package com.jpmonitor.domains.finance.dto;

import java.math.BigDecimal;

public record BudgetVarianceDTO(
    String categoryName,
    BigDecimal allocatedBudget,
    BigDecimal actualSpent,
    BigDecimal varianceAmount,
    Double variancePercentage,
    String status // WITHIN_BUDGET, OVER_BUDGET
) {}
