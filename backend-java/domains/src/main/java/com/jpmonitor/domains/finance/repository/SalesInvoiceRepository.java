package com.jpmonitor.domains.finance.repository;

import com.jpmonitor.domains.finance.entity.SalesInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, String> {
    List<SalesInvoice> findByStatus(String status);
}
