package com.jpmonitor.domains.inventory.service.impl;

import com.jpmonitor.domains.core.entity.Location;
import com.jpmonitor.domains.core.repository.LocationRepository;
import com.jpmonitor.domains.inventory.dto.SparePartDTO;
import com.jpmonitor.domains.inventory.entity.SparePart;
import com.jpmonitor.domains.inventory.repository.InventoryTransactionRepository;
import com.jpmonitor.domains.inventory.repository.SparePartRepository;
import com.jpmonitor.domains.notification.service.TelegramNotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Inventory service location tests")
class InventoryServiceImplTest {

    @Mock
    private SparePartRepository sparePartRepository;

    @Mock
    private InventoryTransactionRepository transactionRepository;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    @Mock
    private LocationRepository locationRepository;

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    @Test
    @DisplayName("Should persist the selected location when creating a spare part")
    void createPartPersistsLocation() {
        UUID locationId = UUID.randomUUID();
        Location location = new Location();
        location.setId(locationId);
        location.setCode("LOC-WS");
        location.setName("Satui Workshop & Store");

        when(locationRepository.findById(locationId)).thenReturn(Optional.of(location));
        when(sparePartRepository.save(any(SparePart.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SparePartDTO request = new SparePartDTO(
                null,
                "FILTER-001",
                "Hydraulic Filter",
                "ACME",
                "Consumable",
                10,
                2,
                "PCS",
                locationId,
                "RACK-078",
                null,
                null);

        inventoryService.createPart(request);

        ArgumentCaptor<SparePart> partCaptor = ArgumentCaptor.forClass(SparePart.class);
        verify(sparePartRepository).save(partCaptor.capture());
        assertThat(partCaptor.getValue().getLocation()).isSameAs(location);
        assertThat(partCaptor.getValue().getRackCode()).isEqualTo("RACK-078");
    }
}

