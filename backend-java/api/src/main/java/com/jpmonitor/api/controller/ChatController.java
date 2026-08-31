package com.jpmonitor.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jpmonitor.api.dto.ChatRequest;
import com.jpmonitor.api.dto.ChatResponse;
import com.jpmonitor.domains.core.entity.User;
import com.jpmonitor.domains.core.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    @Value("${hermes.api.url:http://localhost:8642}")
    private String hermesApiUrl;

    @Value("${hermes.api.key:hermes-jpmonitor-dev}")
    private String hermesApiKey;

    @Value("${comet.api.url:https://api.cometapi.com}")
    private String cometApiUrl;

    @Value("${comet.api.key:}")
    private String cometApiKey;

    @Value("${comet.api.model:gemini-3.5-flash}")
    private String cometApiModel;

    public ChatController(RestTemplate restTemplate, ObjectMapper objectMapper, UserService userService) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> chat(@RequestBody ChatRequest request,
                                  @AuthenticationPrincipal UserDetails userDetails) {
        String message = request.message() != null ? request.message().trim() : "";
        if (message.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is required"));
        }

        String username = userDetails.getUsername();
        log.info("Chat request from user '{}': {}", username,
                message.substring(0, Math.min(100, message.length())));

        String systemPrompt = buildMyanmarSystemPrompt(username);
        String reply = null;

        // 1. Primary Attempt: Hermes Agent API
        try {
            log.info("Attempting AI response via Hermes Agent API...");
            reply = callHermesApi(systemPrompt, message, request.stream());
        } catch (Exception e) {
            log.warn("Hermes Agent API unavailable or failed: {}. Triggering CometAPI (Gemini) Fallback...", e.getMessage());
        }

        // 2. Fallback Attempt: CometAPI (Gemini Text Generation API)
        if (reply == null || reply.isBlank()) {
            try {
                if (cometApiKey != null && !cometApiKey.isBlank()) {
                    log.info("Executing CometAPI (Gemini) fallback...");
                    reply = callCometApi(systemPrompt, message);
                } else {
                    log.warn("CometAPI Key is not configured in environment (COMET_API_KEY).");
                }
            } catch (Exception e) {
                log.error("CometAPI fallback failed: {}", e.getMessage(), e);
            }
        }

        // 3. System Default Response if both AI providers are unreachable
        if (reply == null || reply.isBlank()) {
            reply = "မင်္ဂလာပါ! လက်ရှိတွင် AI မော်ဒယ်လ် ဝန်ဆောင်မှု ချိတ်ဆက်၍ မရသေးပါ။ Hermes Agent သို့မဟုတ် CometAPI Key (Gemini) တည်ဆောက်ပုံကို စစ်ဆေးပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။";
        }

        return ResponseEntity.ok(new ChatResponse(reply, request.conversationId()));
    }

    private String buildMyanmarSystemPrompt(String username) {
        User user = userService.findByUsername(username);
        String fullName = user != null && user.getFullName() != null ? user.getFullName() : username;
        String roleName = user != null && user.getRole() != null ? user.getRole().getName() : "General User";

        return String.format(
                """
                မင်္ဂလာပါ! သင်သည် JP Monitor (ရွှေနှင့် သတ္တုတူးဖော်ရေး မိုင်းနင်း ERP စနစ်) ၏ တရားဝင် AI မိုဘိုင်းနှင့် ဝက်ဘ် အကူအညီပေးရေး လက်ထောက် (Atia AI Assistant) ဖြစ်ပါသည်။

                လက်ရှိ အသုံးပြုသူ အချက်အလက်များ:
                - အမည်: %s
                - သုံးစွဲသူ အကောင့်: %s
                - ရာထူး/Role: %s

                JP Monitor ERP စနစ်၏ အဓိက လုပ်ငန်းစဉ် (Workflows) များနှင့် ပတ်သက်၍ အောက်ပါအတိုင်း အသေးစိတ် လမ်းညွှန် အဖြေပေးရမည်:

                ၁။ စတိုနှင့် ပစ္စည်းစတော့ စီမံခန့်ခွဲမှု (Store & Parts Inventory):
                   - ပစ္စည်းအပိုအပိုများ (Spare Parts) ထုတ်ယူခြင်း၊ ဓာတ်ပုံမှတစ်ဆင့် OCR AI Scan ဖတ်၍ ဘောက်ချာသွင်းခြင်း။
                   - Low Stock Alert (အနည်းဆုံး စတော့အောက် လျော့နည်းပါက သတိပေးချက်ထုတ်ခြင်း)။

                ၂။ စက်ယန္တရားများနှင့် ပြုပြင်ထိန်းသိမ်းမှု (Fleet Management & Maintenance):
                   - Excavator, Dump Truck, Bulldozer စသည်တို့၏ Service Log, Hour Meter (HM) နှင့် Maintenance Work Orders သွင်းခြင်း။

                ၃။ GIS Pit ကျင်းများနှင့် ရွှေကြော မြေပုံညွှန်း (GIS Pit Mapping & Geological AI):
                   - GPS Lat/Lng Coordinates၊ တူးဖော်ပြီး အနက် (-Meters)၊ ရွှေပါဝင်မှု Grade (g/t) နှင့် Slope Safety Risk ခန့်မှန်းချက်။
                   - Google Earth KML / GeoJSON File များမှတစ်ဆင့် Pit Boundary အသစ် တင်သွင်းခြင်း။

                ၄။ တူးဖော်မှုနှင့် ဓာတ်ခွဲခန်း မှတ်တမ်းများ (Production & Assay Lab Tests):
                   - နေ့စဉ် Shift အလိုက် မြေရိုင်း (Ore Tonnage) နှင့် Overburden (BCM) တူးဖော်မှု မှတ်တမ်း။
                   - Assay Lab Test Entry ဖြင့် ရွှေပါဝင်မှု Grade update လုပ်ခြင်း။

                ၅။ ကန်ထရိုက်တာ တူးဖော်ရေး စီမံခန့်ခွဲမှု (Contractor Mining Workflow):
                   - Assignment သတ်မှတ်ခြင်း၊ Daily Production Reports တင်သွင်းခြင်း၊ Weighbridge Measurement စစ်ဆေးခြင်းနှင့် ရွှေအထွက် ပေဝေမှု (Settlement Share)။

                ၆။ ဘဏ္ဍာရေး၊ ရွှေရောင်းရငွေနှင့် တော်ဝင်ကြေး (Finance, Gold Sales & Royalties):
                   - Supplier Accounts Payable (AP) Aging Analysis (0-30, 31-60, 61-90, 90+ ရက်)။
                   - ရွှေချောင်း ရောင်းရငွေ (Fine Gold Weight ကျပ်/Grams၊ သန့်စင်မှု %၊ ၁ ကျပ်စျေးနှုန်း)။
                   - နိုင်ငံတော်သို့ ပေးဆောင်ရမည့် ၅%% တော်ဝင်ကြေး (Government Mining Royalty Tax) နှင့် Treasury Receipt။
                   - World Gold Council Standard All-In Sustaining Cost (AISC) ရွှေ ၁ ကျပ်/ဂရမ် တူးဖော်မှု စရိတ် အသားတင် အမြတ် (Net Mining Margin)။

                ၇။ ဘေးအန္တရာယ် ကင်းရှင်းရေး (HSE & Incidents) နှင့် အသုံးပြုခွင့် (RBAC & Audit Trail):
                   - Incident Reporting နှင့် User Role Permissions စစ်ဆေးခြင်း။

                အထွေထွေ ညွှန်ကြားချက်များ:
                - မြန်မာဘာသာစကား (Myanmar Unicode) ဖြင့် သာယာပြေပြစ်စွာ၊ တိကျစွာနှင့် လိုရင်းတိုရှင်း ရှင်းလင်း ဖြေကြားပေးပါ။
                - မြန်မာ့ရွှေ အလေးချိန် အခေါ်အဝေါ် (ကျပ်) နှင့် Grams, AISC တန်ဖိုးများကို တိကျစွာ ရှင်းပြပေးပါ။
                """,
                fullName, username, roleName
        ).strip();
    }

    private String callHermesApi(String systemPrompt, String userMessage, boolean stream) throws Exception {
        String url = hermesApiUrl + "/v1/chat/completions";

        Map<String, Object> requestBody = Map.of(
                "model", "hermes",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                ),
                "stream", stream
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (hermesApiKey != null && !hermesApiKey.isBlank()) {
            headers.setBearerAuth(hermesApiKey);
        }

        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            log.warn("Hermes API returned status: {}", response.getStatusCode());
            throw new RuntimeException("Hermes API returned status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode choices = root.get("choices");
        if (choices != null && choices.isArray() && !choices.isEmpty()) {
            JsonNode messageNode = choices.get(0).get("message");
            if (messageNode != null) {
                JsonNode content = messageNode.get("content");
                if (content != null && !content.isNull()) {
                    return content.asText();
                }
            }
        }

        log.warn("Could not extract reply from Hermes response");
        return null;
    }

    private String callCometApi(String systemPrompt, String userMessage) throws Exception {
        // CometAPI Gemini Endpoint: /v1beta/models/{model}:generateContent
        String url = String.format("%s/v1beta/models/%s:generateContent",
                cometApiUrl.replaceAll("/+$", ""),
                cometApiModel);

        Map<String, Object> requestBody = Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt))
                ),
                "contents", List.of(
                        Map.of(
                                "role", "user",
                                "parts", List.of(Map.of("text", userMessage))
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 2048
                )
        );

        String jsonBody = objectMapper.writeValueAsString(requestBody);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", cometApiKey);
        headers.setBearerAuth(cometApiKey);

        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            log.warn("CometAPI returned status: {}", response.getStatusCode());
            throw new RuntimeException("CometAPI returned status: " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidates = root.get("candidates");
        if (candidates != null && candidates.isArray() && !candidates.isEmpty()) {
            JsonNode contentNode = candidates.get(0).get("content");
            if (contentNode != null) {
                JsonNode partsNode = contentNode.get("parts");
                if (partsNode != null && partsNode.isArray() && !partsNode.isEmpty()) {
                    JsonNode textNode = partsNode.get(0).get("text");
                    if (textNode != null && !textNode.isNull()) {
                        return textNode.asText();
                    }
                }
            }
        }

        log.warn("Could not parse candidates from CometAPI Gemini response");
        return null;
    }
}
