package com.jpmonitor.domains.finance.dto;

import java.math.BigDecimal;

public record EquipmentDepreciationDTO(
    String equipmentId,
    String equipmentCode,
    String model,
    BigDecimal purchasePrice,
    Double totalEngineHours,
    BigDecimal hourlyDepreciationRate,
    BigDecimal accumulatedDepreciation,
    BigDecimal netBookValue
) {}
