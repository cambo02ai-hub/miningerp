package com.jpmonitor.domains.finance.dto;

import java.math.BigDecimal;

public record CashFlowForecastDTO(
    String weekPeriod,
    BigDecimal expectedInflowsAR,
    BigDecimal expectedOutflowsAP,
    BigDecimal netCashFlow,
    BigDecimal endingCashBalance
) {}
