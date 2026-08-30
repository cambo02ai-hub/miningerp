package com.jpmonitor.domains.finance.repository;

import com.jpmonitor.domains.finance.entity.BudgetPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BudgetPlanRepository extends JpaRepository<BudgetPlan, String> {
    List<BudgetPlan> findByBudgetYear(Integer budgetYear);
}
