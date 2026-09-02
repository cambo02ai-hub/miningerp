package com.jpmonitor.domains.inventory.service.impl;

import com.jpmonitor.domains.inventory.dto.InventoryTransactionDTO;
import com.jpmonitor.domains.inventory.dto.SparePartDTO;
import com.jpmonitor.domains.inventory.entity.InventoryTransaction;
import com.jpmonitor.domains.inventory.entity.SparePart;
import com.jpmonitor.domains.inventory.repository.InventoryTransactionRepository;
import com.jpmonitor.domains.inventory.repository.SparePartRepository;
import com.jpmonitor.domains.inventory.service.InventoryService;
import com.jpmonitor.domains.notification.service.TelegramNotificationService;
import com.jpmonitor.platform.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final SparePartRepository sparePartRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final TelegramNotificationService telegramNotificationService;

    // ==================== PARTS ====================

    @Override
    @Transactional(readOnly = true)
    public List<SparePartDTO> getAllParts(String category, Boolean lowStock) {
        List<SparePart> parts;
        if (category != null || (lowStock != null && lowStock)) {
            parts = sparePartRepository.findAll().stream()
                    .filter(p -> category == null || category.equals(p.getCategory()))
                    .filter(p -> lowStock == null || !lowStock || p.getCurrentStock() < p.getMinStockLevel())
                    .collect(Collectors.toList());
        } else {
            parts = sparePartRepository.findAll();
        }

        return parts.stream()
                .map(this::mapPartToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SparePartDTO getPart(UUID id) {
        SparePart part = sparePartRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spare Part", id));
        return mapPartToDTO(part);
    }

    @Override
    public SparePartDTO createPart(SparePartDTO dto) {
        SparePart part = new SparePart();
        updatePartFromDTO(part, dto);
        SparePart saved = sparePartRepository.save(part);
        checkAndTriggerLowStockAlert(saved, "Part Creation/Update");
        return mapPartToDTO(saved);
    }

    @Override
    public SparePartDTO updatePart(UUID id, SparePartDTO dto) {
        SparePart part = sparePartRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spare Part", id));
        updatePartFromDTO(part, dto);
        SparePart saved = sparePartRepository.save(part);
        checkAndTriggerLowStockAlert(saved, "Part Update");
        return mapPartToDTO(saved);
    }

    @Override
    public void deletePart(UUID id) {
        if (!sparePartRepository.existsById(id)) {
            throw new ResourceNotFoundException("Spare Part", id);
        }
        sparePartRepository.deleteById(id);
    }

    // ==================== TRANSACTIONS ====================

    @Override
    @Transactional(readOnly = true)
    public List<InventoryTransactionDTO> getTransactions(String type, UUID partId, UUID supplierId,
                                                          String fromDate, String toDate) {
        List<InventoryTransaction> transactions = transactionRepository.findAll();

        return transactions.stream()
                .filter(tx -> type == null || type.equals(tx.getType()))
                .filter(tx -> partId == null || partId.equals(tx.getPart().getId()))
                .filter(tx -> supplierId == null
                        || (tx.getSupplier() != null && supplierId.equals(tx.getSupplier().getId())))
                .filter(tx -> fromDate == null || !tx.getDate().isBefore(LocalDate.parse(fromDate)))
                .filter(tx -> toDate == null || !tx.getDate().isAfter(LocalDate.parse(toDate)))
                .map(this::mapTxToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public InventoryTransactionDTO createTransaction(InventoryTransactionDTO dto) {
        InventoryTransaction tx = new InventoryTransaction();
        tx.setTrxNumber("TRX-" + System.currentTimeMillis());
        tx.setDate(LocalDate.parse(dto.date()));
        tx.setType(dto.type());
        tx.setQuantity(dto.quantity());
        tx.setAppliedPrice(dto.pricePerUnit());
        tx.setReferenceId(dto.referenceId());
        tx.setNotes(dto.notes());

        // Set payment fields
        tx.setPaymentMethod(dto.paymentMethod());
        tx.setDueDate(dto.dueDate() != null ? LocalDate.parse(dto.dueDate()) : null);
        tx.setPaidDate(dto.paidDate() != null ? LocalDate.parse(dto.paidDate()) : null);

        // Fetch Part
        SparePart part = sparePartRepository.findById(dto.partId())
                .orElseThrow(() -> new ResourceNotFoundException("Spare Part", dto.partId()));
        tx.setPart(part);

        // Logic update stock (Simplified for demo)
        if ("USAGE".equals(dto.type())) {
            int newStock = part.getCurrentStock() - dto.quantity();
            if (newStock < 0) {
                throw new IllegalArgumentException(
                        "Insufficient stock. Current: " + part.getCurrentStock() + ", Requested: " + dto.quantity());
            }
            part.setCurrentStock(newStock);
        } else {
            part.setCurrentStock(part.getCurrentStock() + dto.quantity());
        }
        sparePartRepository.save(part);
        checkAndTriggerLowStockAlert(part, "Inventory Transaction (" + dto.type() + ")");

        InventoryTransaction saved = transactionRepository.save(tx);
        return mapTxToDTO(saved);
    }

    private void checkAndTriggerLowStockAlert(SparePart part, String triggerContext) {
        if (part != null && part.getCurrentStock() <= part.getMinStockLevel()) {
            telegramNotificationService.sendLowStockAlert(part, triggerContext);
        }
    }

    @Override
    public InventoryTransactionDTO updateTransaction(UUID id, InventoryTransactionDTO dto) {
        InventoryTransaction tx = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory Transaction", id));

        // Allow updating notes and reference
        if (dto.notes() != null) {
            tx.setNotes(dto.notes());
        }
        if (dto.referenceId() != null) {
            tx.setReferenceId(dto.referenceId());
        }

        InventoryTransaction saved = transactionRepository.save(tx);
        return mapTxToDTO(saved);
    }

    // ==================== HELPER METHODS ====================

    private void updatePartFromDTO(SparePart part, SparePartDTO dto) {
        part.setPartNumber(dto.partNumber());
        part.setName(dto.name());
        part.setBrand(dto.brand());
        part.setCategory(dto.category());
        part.setCurrentStock(dto.currentStock());
        part.setMinStockLevel(dto.minStockLevel());
        part.setUnit(dto.unit());
        part.setRackCode(dto.location()); // Frontend sends "location" as Rack Code string
    }

    private SparePartDTO mapPartToDTO(SparePart p) {
        return new SparePartDTO(
                p.getId(),
                p.getPartNumber(),
                p.getName(),
                p.getBrand(),
                p.getCategory(),
                p.getCurrentStock(),
                p.getMinStockLevel(),
                p.getUnit(),
                p.getLocation() != null ? p.getLocation().getId() : null,
                p.getRackCode(),
                p.getCurrentPriceCash(),
                p.getPreferredSupplier() != null ? p.getPreferredSupplier().getId() : null);
    }

    private InventoryTransactionDTO mapTxToDTO(InventoryTransaction tx) {
        String paymentStatus = null;
        if (tx.getDueDate() != null) {
            paymentStatus = tx.getDueDate().isBefore(LocalDate.now()) ? "Overdue" : "Pending";
        }

        return new InventoryTransactionDTO(
                tx.getId(),
                tx.getDate().toString(),
                tx.getType(),
                tx.getPart().getId(),
                tx.getQuantity(),
                tx.getAppliedPrice(),
                tx.getReferenceId(),
                tx.getEquipment() != null ? tx.getEquipment().getId() : null,
                tx.getSupplier() != null ? tx.getSupplier().getId() : null,
                tx.getNotes(),
                tx.getPaymentMethod(),
                paymentStatus,
                tx.getDueDate() != null ? tx.getDueDate().toString() : null,
                null); // paidDate (not in entity yet)
    }
}
