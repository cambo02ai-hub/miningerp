package com.jpmonitor.domains.hse.service.impl;

import com.jpmonitor.domains.core.repository.LocationRepository;
import com.jpmonitor.domains.core.repository.ProjectRepository;
import com.jpmonitor.domains.hr.repository.EmployeeRepository;
import com.jpmonitor.domains.hse.dto.IncidentDTO;
import com.jpmonitor.domains.hse.entity.Incident;
import com.jpmonitor.domains.hse.repository.IncidentRepository;
import com.jpmonitor.domains.hse.service.IncidentService;
import com.jpmonitor.domains.notification.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class IncidentServiceImpl implements IncidentService {

    private final IncidentRepository incidentRepository;
    private final LocationRepository locationRepository;
    private final ProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;
    private final TelegramNotificationService telegramNotificationService;

    @Override
    @Transactional(readOnly = true)
    public List<IncidentDTO> getAllIncidents() {
        return incidentRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public IncidentDTO createIncident(IncidentDTO dto) {
        Incident incident = new Incident();
        updateEntity(incident, dto);
        Incident saved = incidentRepository.save(incident);
        checkAndTriggerCriticalIncidentAlert(saved);
        return mapToDTO(saved);
    }

    private void checkAndTriggerCriticalIncidentAlert(Incident incident) {
        if (incident != null && incident.getSeverity() != null) {
            String severity = incident.getSeverity().toUpperCase();
            if ("HIGH".equals(severity) || "CRITICAL".equals(severity) || "FATALITY".equals(severity) || "MAJOR".equals(severity)) {
                telegramNotificationService.sendCriticalIncidentAlert(incident);
            }
        }
    }

    @Override
    public IncidentDTO updateIncident(UUID id, IncidentDTO dto) {
        Incident incident = incidentRepository.findById(id).orElseThrow();
        updateEntity(incident, dto);
        return mapToDTO(incidentRepository.save(incident));
    }

    @Override
    public void deleteIncident(UUID id) {
        incidentRepository.deleteById(id);
    }

    private void updateEntity(Incident incident, IncidentDTO dto) {
        incident.setDate(LocalDate.parse(dto.date()));
        if (dto.time() != null) {
            incident.setTime(LocalTime.parse(dto.time()));
        }
        incident.setType(dto.type());
        incident.setSeverity(dto.severity());

        if (dto.locationId() != null) {
            incident.setLocation(locationRepository.findById(dto.locationId()).orElse(null));
        }

        if (dto.projectId() != null) {
            incident.setProject(projectRepository.findById(dto.projectId()).orElse(null));
        }

        incident.setLocationDetail(dto.locationDetail());
        incident.setDescription(dto.description());
        incident.setImmediateAction(dto.immediateAction());
        incident.setStatus(dto.status());

        if (dto.reportedById() != null) {
            incident.setReportedBy(employeeRepository.findById(dto.reportedById()).orElse(null));
        }
    }

    private IncidentDTO mapToDTO(Incident i) {
        return new IncidentDTO(
                i.getId(),
                i.getDate().toString(),
                i.getTime() != null ? i.getTime().toString() : null,
                i.getType(),
                i.getSeverity(),
                i.getLocation() != null ? i.getLocation().getId() : null,
                i.getLocation() != null ? i.getLocation().getName() : null,
                i.getProject() != null ? i.getProject().getId() : null,
                i.getProject() != null ? i.getProject().getName() : null,
                i.getLocationDetail(),
                i.getDescription(),
                i.getImmediateAction(),
                i.getStatus(),
                i.getReportedBy() != null ? i.getReportedBy().getId() : null,
                i.getReportedBy() != null ? i.getReportedBy().getName() : null);
    }
}
