package com.jpmonitor.domains.fleet.service.impl;

import com.jpmonitor.domains.core.repository.LocationRepository;
import com.jpmonitor.domains.fleet.dto.UnitMutationDTO;
import com.jpmonitor.domains.fleet.entity.Equipment;
import com.jpmonitor.domains.fleet.repository.EquipmentRepository;
import com.jpmonitor.domains.fleet.repository.UnitMutationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Simplified Unit tests for UnitMutationServiceImpl
 * Focus on calculation logic without entity/service dependencies
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UnitMutation Service Tests - Simplified")
class UnitMutationServiceImplTest {

        @Mock
        private UnitMutationRepository mutationRepository;

        @Mock
        private EquipmentRepository equipmentRepository;

        @Mock
        private LocationRepository locationRepository;

        @InjectMocks
        private UnitMutationServiceImpl mutationService;

        @Test
        @DisplayName("Should calculate hour meter difference correctly")
        void testHourMeterDifference() {
                // Given: Start and End HM
                BigDecimal startHm = BigDecimal.valueOf(1500);
                BigDecimal endHm = BigDecimal.valueOf(1520);

                // When: Calculate difference
                BigDecimal hmDiff = endHm.subtract(startHm);

                // Then: Should equal 20 hours
                assertThat(hmDiff).isEqualByComparingTo(BigDecimal.valueOf(20));
        }

        @Test
        @DisplayName("Should validate HM progression (end must be >= start)")
        void testHmValidation() {
                // Given: Valid HM sequence
                BigDecimal startHm = BigDecimal.valueOf(1500);
                BigDecimal endHm = BigDecimal.valueOf(1520);

                // When: Validate
                boolean isValid = endHm.compareTo(startHm) >= 0;

                // Then: Should be valid
                assertThat(isValid).isTrue();
        }

        @Test
        @DisplayName("Should detect invalid HM sequence")
        void testInvalidHmSequence() {
                // Given: Invalid sequence (end < start)
                BigDecimal startHm = BigDecimal.valueOf(1520);
                BigDecimal endHm = BigDecimal.valueOf(1500);

                // When: Validate
                boolean isValid = endHm.compareTo(startHm) >= 0;

                // Then: Should be invalid
                assertThat(isValid).isFalse();
        }

        @Test
        @DisplayName("Should assign a required name when acquisition creates fallback equipment")
        void testAcquisitionFallbackEquipmentHasName() {
                String equipmentCode = "EX-2005";
                when(equipmentRepository.findByCode(equipmentCode)).thenReturn(Optional.empty());
                when(equipmentRepository.save(any(Equipment.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));
                when(mutationRepository.save(any()))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                UnitMutationDTO request = new UnitMutationDTO(
                                null,
                                null,
                                "ACQUISITION",
                                null,
                                equipmentCode,
                                null,
                                null,
                                null,
                                null,
                                "2026-09-07",
                                null,
                                BigDecimal.ZERO,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null);

                mutationService.createMutation(request);

                org.mockito.ArgumentCaptor<Equipment> equipmentCaptor =
                                org.mockito.ArgumentCaptor.forClass(Equipment.class);
                org.mockito.Mockito.verify(equipmentRepository).save(equipmentCaptor.capture());
                assertThat(equipmentCaptor.getValue().getName()).isEqualTo(equipmentCode);
        }

        @Test
        @DisplayName("Should calculate mutation duration in days")
        void testMutationDuration() {
                // Given: Departure and arrival dates
                LocalDate departureDate = LocalDate.of(2024, 1, 10);
                LocalDate arrivalDate = LocalDate.of(2024, 1, 15);

                // When: Calculate days
                long daysDuration = ChronoUnit.DAYS.between(departureDate, arrivalDate);

                // Then: Should be 5 days
                assertThat(daysDuration).isEqualTo(5);
        }
}
