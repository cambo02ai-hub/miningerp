package com.jpmonitor.domains.notification.service.impl;

import com.jpmonitor.domains.hse.entity.Incident;
import com.jpmonitor.domains.inventory.entity.SparePart;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramNotificationServiceImplTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private TelegramNotificationServiceImpl telegramNotificationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(telegramNotificationService, "botToken", "test-token");
        ReflectionTestUtils.setField(telegramNotificationService, "chatId", "12345678");
        ReflectionTestUtils.setField(telegramNotificationService, "enabled", true);
    }

    @Test
    void sendMessage_success() {
        when(restTemplate.postForEntity(eq("https://api.telegram.org/bottest-token/sendMessage"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK));

        boolean result = telegramNotificationService.sendMessage("Test Message");

        assertTrue(result);
        verify(restTemplate).postForEntity(eq("https://api.telegram.org/bottest-token/sendMessage"), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void sendMessage_disabled() {
        ReflectionTestUtils.setField(telegramNotificationService, "enabled", false);

        boolean result = telegramNotificationService.sendMessage("Test Message");

        assertFalse(result);
    }

    @Test
    void sendLowStockAlert_triggersMessage() {
        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK));

        SparePart part = new SparePart();
        part.setName("Hydraulic Filter");
        part.setPartNumber("HF-9001");
        part.setCurrentStock(2);
        part.setMinStockLevel(10);
        part.setUnit("PCS");

        telegramNotificationService.sendLowStockAlert(part, "Unit Test");

        verify(restTemplate).postForEntity(any(String.class), any(HttpEntity.class), eq(String.class));
    }

    @Test
    void sendCriticalIncidentAlert_triggersMessage() {
        when(restTemplate.postForEntity(any(String.class), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"ok\":true}", HttpStatus.OK));

        Incident incident = new Incident();
        incident.setType("EQUIPMENT_COLLISION");
        incident.setSeverity("HIGH");
        incident.setDate(LocalDate.now());
        incident.setTime(LocalTime.of(14, 30));
        incident.setDescription("Dump truck backed into loader");

        telegramNotificationService.sendCriticalIncidentAlert(incident);

        verify(restTemplate).postForEntity(any(String.class), any(HttpEntity.class), eq(String.class));
    }
}
