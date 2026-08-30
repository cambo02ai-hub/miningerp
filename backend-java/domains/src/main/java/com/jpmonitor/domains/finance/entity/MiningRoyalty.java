package com.jpmonitor.domains.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "mining_royalties")
public class MiningRoyalty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "period_name", nullable = false)
    private String periodName;

    @Column(name = "production_volume_tons", nullable = false)
    private BigDecimal productionVolumeTons;

    @Column(name = "royalty_rate_percent", nullable = false)
    private BigDecimal royaltyRatePercent;

    @Column(name = "royalty_amount", nullable = false)
    private BigDecimal royaltyAmount;

    @Column(name = "environmental_tax")
    private BigDecimal environmentalTax;

    @Column(name = "total_tax_due", nullable = false)
    private BigDecimal totalTaxDue;

    @Column(name = "status", nullable = false)
    private String status; // PENDING, PAID

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "remarks")
    private String remarks;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPeriodName() { return periodName; }
    public void setPeriodName(String periodName) { this.periodName = periodName; }

    public BigDecimal getProductionVolumeTons() { return productionVolumeTons; }
    public void setProductionVolumeTons(BigDecimal productionVolumeTons) { this.productionVolumeTons = productionVolumeTons; }

    public BigDecimal getRoyaltyRatePercent() { return royaltyRatePercent; }
    public void setRoyaltyRatePercent(BigDecimal royaltyRatePercent) { this.royaltyRatePercent = royaltyRatePercent; }

    public BigDecimal getRoyaltyAmount() { return royaltyAmount; }
    public void setRoyaltyAmount(BigDecimal royaltyAmount) { this.royaltyAmount = royaltyAmount; }

    public BigDecimal getEnvironmentalTax() { return environmentalTax; }
    public void setEnvironmentalTax(BigDecimal environmentalTax) { this.environmentalTax = environmentalTax; }

    public BigDecimal getTotalTaxDue() { return totalTaxDue; }
    public void setTotalTaxDue(BigDecimal totalTaxDue) { this.totalTaxDue = totalTaxDue; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalDate getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDate paidDate) { this.paidDate = paidDate; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
