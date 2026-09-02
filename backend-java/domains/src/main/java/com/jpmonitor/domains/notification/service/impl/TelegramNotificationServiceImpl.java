package com.jpmonitor.domains.notification.service.impl;

import com.jpmonitor.domains.hse.entity.Incident;
import com.jpmonitor.domains.inventory.entity.SparePart;
import com.jpmonitor.domains.notification.service.TelegramNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramNotificationServiceImpl implements TelegramNotificationService {

    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.bot.chat-id:}")
    private String chatId;

    @Value("${telegram.bot.enabled:true}")
    private boolean enabled;

    @Override
    public boolean sendMessage(String message) {
        if (!enabled) {
            log.info("Telegram notification skipped: service disabled via configuration.");
            return false;
        }

        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            log.warn("Telegram notification skipped: bot token or chat ID is not configured.");
            return false;
        }

        try {
            String url = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", message);
            body.put("parse_mode", "HTML");
            body.put("disable_web_page_preview", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully sent Telegram notification to chat ID: {}", chatId);
                return true;
            } else {
                log.error("Failed to send Telegram notification. Status: {}", response.getStatusCode());
                return false;
            }
        } catch (Exception e) {
            log.error("Exception occurred while sending Telegram message: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    @Async
    public void sendLowStockAlert(SparePart part, String triggerContext) {
        if (part == null) return;

        StringBuilder sb = new StringBuilder();
        sb.append("⚠️ <b>LOW STOCK ALERT - အနည်းဆုံး စတော့အောက် လျော့နည်းနေသည်</b> ⚠️\n\n");
        sb.append("<b>Part Name:</b> ").append(escapeHtml(part.getName())).append("\n");
        sb.append("<b>Part Code / No:</b> ").append(escapeHtml(part.getPartNumber())).append("\n");
        sb.append("<b>Brand / Category:</b> ").append(escapeHtml(part.getBrand() != null ? part.getBrand() : "N/A"))
                .append(" / ").append(escapeHtml(part.getCategory() != null ? part.getCategory() : "N/A")).append("\n");
        sb.append("<b>Current Stock:</b> 🔴 <b>").append(part.getCurrentStock()).append(" ").append(escapeHtml(part.getUnit() != null ? part.getUnit() : "Units")).append("</b>\n");
        sb.append("<b>Min Required Stock:</b> ").append(part.getMinStockLevel()).append("\n");
        sb.append("<b>Rack / Location:</b> ").append(escapeHtml(part.getRackCode() != null ? part.getRackCode() : "N/A")).append("\n");
        if (triggerContext != null) {
            sb.append("<b>Trigger Context:</b> ").append(escapeHtml(triggerContext)).append("\n");
        }
        sb.append("\nℹ️ <i>ကျေးဇူးပြု၍ Reorder ပြုလုပ်ရန် စတော့ဂိုဒေါင် တာဝန်ရှိသူအား အကြောင်းကြားပါ။</i>");

        sendMessage(sb.toString());
    }

    @Override
    @Async
    public void sendCriticalIncidentAlert(Incident incident) {
        if (incident == null) return;

        StringBuilder sb = new StringBuilder();
        sb.append("🚨 <b>CRITICAL HSE INCIDENT ALERT - အရေးကြီး အခင်းဖြစ်ပွားမှု သတိပေးချက်</b> 🚨\n\n");
        sb.append("<b>Incident Type:</b> ").append(escapeHtml(incident.getType())).append("\n");
        sb.append("<b>Severity Level:</b> 🔴 <b>").append(escapeHtml(incident.getSeverity())).append("</b>\n");
        sb.append("<b>Date / Time:</b> ").append(incident.getDate());
        if (incident.getTime() != null) {
            sb.append(" ").append(incident.getTime().format(DateTimeFormatter.ofPattern("HH:mm")));
        }
        sb.append("\n");
        if (incident.getLocation() != null) {
            sb.append("<b>Location:</b> ").append(escapeHtml(incident.getLocation().getName())).append("\n");
        }
        if (incident.getLocationDetail() != null && !incident.getLocationDetail().isBlank()) {
            sb.append("<b>Detail Location:</b> ").append(escapeHtml(incident.getLocationDetail())).append("\n");
        }
        if (incident.getDescription() != null && !incident.getDescription().isBlank()) {
            sb.append("<b>Description:</b> ").append(escapeHtml(incident.getDescription())).append("\n");
        }
        if (incident.getImmediateAction() != null && !incident.getImmediateAction().isBlank()) {
            sb.append("<b>Immediate Action:</b> ").append(escapeHtml(incident.getImmediateAction())).append("\n");
        }
        sb.append("\n⚠️ <i>အရေးပေါ် တုံ့ပြန်ရေးအဖွဲ့မှ လိုအပ်သော အရေးယူ ဆောင်ရွက်ချက်များ ဆောင်ရွက်ပေးပါရန်။</i>");

        sendMessage(sb.toString());
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
