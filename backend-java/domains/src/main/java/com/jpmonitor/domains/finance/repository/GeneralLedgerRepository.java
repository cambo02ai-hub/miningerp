package com.jpmonitor.domains.finance.repository;

import com.jpmonitor.domains.finance.entity.GeneralLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneralLedgerRepository extends JpaRepository<GeneralLedgerEntry, String> {
    List<GeneralLedgerEntry> findByAccountType(String accountType);
}
