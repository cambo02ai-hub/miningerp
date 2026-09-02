package com.jpmonitor.domains.notification.service;

import com.jpmonitor.domains.hse.entity.Incident;
import com.jpmonitor.domains.inventory.entity.SparePart;

public interface TelegramNotificationService {

    /**
     * Sends a raw message to the configured Telegram chat.
     *
     * @param message Text message formatted in HTML or plain text
     * @return boolean true if successfully delivered, false otherwise
     */
    boolean sendMessage(String message);

    /**
     * Triggers a Low Stock Alert notification.
     *
     * @param part The SparePart that reached or dropped below minStockLevel
     * @param triggerContext Specific trigger details (e.g. "Inventory Usage", "Stock Update")
     */
    void sendLowStockAlert(SparePart part, String triggerContext);

    /**
     * Triggers a Critical HSE Incident Alert notification.
     *
     * @param incident The reported incident
     */
    void sendCriticalIncidentAlert(Incident incident);
}
