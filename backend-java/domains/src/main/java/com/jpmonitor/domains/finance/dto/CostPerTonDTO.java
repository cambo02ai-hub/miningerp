package com.jpmonitor.domains.finance.dto;

import java.math.BigDecimal;

public record CostPerTonDTO(
    String period,
    BigDecimal totalProductionTons,
    BigDecimal fuelCost,
    BigDecimal maintenanceCost,
    BigDecimal contractorCost,
    BigDecimal royaltyCost,
    BigDecimal totalCost,
    BigDecimal costPerTon,
    BigDecimal obRemovalBcm,
    BigDecimal costPerBcm
) {}
