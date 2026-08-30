package com.jpmonitor.domains.finance.repository;

import com.jpmonitor.domains.finance.entity.MiningRoyalty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MiningRoyaltyRepository extends JpaRepository<MiningRoyalty, String> {
}
