package com.jpmonitor.domains.finance.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "budget_plans")
public class BudgetPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "budget_year", nullable = false)
    private Integer budgetYear;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    @Column(name = "allocated_budget", nullable = false)
    private BigDecimal allocatedBudget;

    @Column(name = "actual_spent")
    private BigDecimal actualSpent;

    @Column(name = "notes")
    private String notes;

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

    public Integer getBudgetYear() { return budgetYear; }
    public void setBudgetYear(Integer budgetYear) { this.budgetYear = budgetYear; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public BigDecimal getAllocatedBudget() { return allocatedBudget; }
    public void setAllocatedBudget(BigDecimal allocatedBudget) { this.allocatedBudget = allocatedBudget; }

    public BigDecimal getActualSpent() { return actualSpent; }
    public void setActualSpent(BigDecimal actualSpent) { this.actualSpent = actualSpent; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
