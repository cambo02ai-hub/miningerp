package com.jpmonitor.domains.fleet.service.impl;

import com.jpmonitor.domains.core.repository.LocationRepository;
import com.jpmonitor.domains.fleet.dto.UnitMutationDTO;
import com.jpmonitor.domains.fleet.entity.UnitMutation;
import com.jpmonitor.domains.fleet.repository.EquipmentRepository;
import com.jpmonitor.domains.fleet.repository.UnitMutationRepository;
import com.jpmonitor.domains.fleet.service.UnitMutationService;
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
public class UnitMutationServiceImpl implements UnitMutationService {

    private final UnitMutationRepository mutationRepository;
    private final EquipmentRepository equipmentRepository;
    private final LocationRepository locationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UnitMutationDTO> getAllMutations() {
        return mutationRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UnitMutationDTO createMutation(UnitMutationDTO dto) {
        UnitMutation mutation = new UnitMutation();
        updateEntity(mutation, dto);
        mutation.setMutationNumber("MUT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

        // ✅ CRITICAL: Update equipment location on mutation (Data Integrity)
        // User Rule: "Selalu pikirkan bagaimana data terhubung"
        if (mutation.getTargetLocation() != null && mutation.getEquipment() != null) {
            mutation.getEquipment().setLocation(mutation.getTargetLocation());
            equipmentRepository.save(mutation.getEquipment());
        }

        return mapToDTO(mutationRepository.save(mutation));
    }

    @Override
    public UnitMutationDTO updateMutation(UUID id, UnitMutationDTO dto) {
        UnitMutation mutation = mutationRepository.findById(id).orElseThrow();
        updateEntity(mutation, dto);

        // ✅ CRITICAL: Update equipment location on mutation update
        if (mutation.getTargetLocation() != null && mutation.getEquipment() != null) {
            mutation.getEquipment().setLocation(mutation.getTargetLocation());
            equipmentRepository.save(mutation.getEquipment());
        }

        return mapToDTO(mutationRepository.save(mutation));
    }

    @Override
    public void deleteMutation(UUID id) {
        mutationRepository.deleteById(id);
    }

    private void updateEntity(UnitMutation m, UnitMutationDTO dto) {
        m.setType(dto.type());
        if (dto.equipmentId() != null) {
            equipmentRepository.findById(dto.equipmentId()).ifPresent(m::setEquipment);
        }
        if (m.getEquipment() == null && dto.equipmentCode() != null && !dto.equipmentCode().isBlank()) {
            com.jpmonitor.domains.fleet.entity.Equipment eq = equipmentRepository.findByCode(dto.equipmentCode().trim()).orElseGet(() -> {
                com.jpmonitor.domains.fleet.entity.Equipment newEq = new com.jpmonitor.domains.fleet.entity.Equipment();
                newEq.setCode(dto.equipmentCode().trim());
                newEq.setName(dto.equipmentCode().trim());
                newEq.setModel(dto.equipmentCode().trim());
                newEq.setType("Excavator");
                newEq.setStatus("Operational");
                return equipmentRepository.save(newEq);
            });
            m.setEquipment(eq);
        }
        m.setEquipmentCode(dto.equipmentCode()); // Snapshot

        if (dto.sourceLocationId() != null) {
            m.setSourceLocation(locationRepository.findById(dto.sourceLocationId()).orElse(null));
        }

        if (dto.targetLocationId() != null) {
            m.setTargetLocation(locationRepository.findById(dto.targetLocationId()).orElse(null));
        }

        if (dto.departureDate() != null) {
            m.setDepartureDate(LocalDate.parse(dto.departureDate()));
        }

        if (dto.arrivalDate() != null) {
            m.setArrivalDate(LocalDate.parse(dto.arrivalDate()));
        }

        m.setMutationHm(dto.mutationHm());
        m.setNotes(dto.notes());
        m.setDriverName(dto.driverName());
        m.setTransportUnit(dto.transportUnit());
        m.setTransportPolNumber(dto.transportPolNumber());
        m.setSenderCompany(dto.senderCompany());
        m.setSenderName(dto.senderName());
        m.setRecipientCompany(dto.recipientCompany());
        m.setRecipientName(dto.recipientName());
    }

    private UnitMutationDTO mapToDTO(UnitMutation m) {
        return new UnitMutationDTO(
                m.getId(),
                m.getMutationNumber(),
                m.getType(),
                m.getEquipment().getId(),
                m.getEquipmentCode(),
                m.getSourceLocation() != null ? m.getSourceLocation().getId() : null,
                m.getSourceLocation() != null ? m.getSourceLocation().getName() : null,
                m.getTargetLocation() != null ? m.getTargetLocation().getId() : null,
                m.getTargetLocation() != null ? m.getTargetLocation().getName() : null,
                m.getDepartureDate().toString(),
                m.getArrivalDate() != null ? m.getArrivalDate().toString() : null,
                m.getMutationHm(),
                m.getNotes(),
                m.getDriverName(),
                m.getTransportUnit(),
                m.getTransportPolNumber(),
                m.getSenderCompany(),
                m.getSenderName(),
                m.getRecipientCompany(),
                m.getRecipientName());
    }
}
