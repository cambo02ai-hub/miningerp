package com.jpmonitor.api.controller;

import com.jpmonitor.domains.notification.service.TelegramNotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications/telegram")
@RequiredArgsConstructor
public class TelegramNotificationController {

    private final TelegramNotificationService telegramNotificationService;

    @PostMapping("/send")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> sendTelegramNotification(@RequestBody SendNotificationRequest request) {
        if (request == null || request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Message body cannot be empty"
            ));
        }

        String formattedMessage = request.getMessage();
        if (request.getPrefixHeader() != null && !request.getPrefixHeader().isBlank()) {
            formattedMessage = "<b>" + request.getPrefixHeader() + "</b>\n\n" + formattedMessage;
        }

        boolean sent = telegramNotificationService.sendMessage(formattedMessage);

        if (sent) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Telegram notification delivered successfully"
            ));
        } else {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to send Telegram notification. Check server logs or bot configuration."
            ));
        }
    }

    @Data
    public static class SendNotificationRequest {
        private String prefixHeader;
        private String message;
    }
}
