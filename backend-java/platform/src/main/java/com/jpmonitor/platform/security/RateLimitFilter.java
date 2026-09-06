package com.jpmonitor.platform.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter - covers all /api/* endpoints with tiered limits.
 * <p>
 * Tiers:
 * - LOGIN  (POST /api/auth/login)        → 10 req/min per IP (brute-force protection)
 * - AUTH   (GET /api/auth/me)            → 30 req/min per user
 * - CHAT   (POST /api/chat)              →  5 req/min per user (expensive AI calls)
 * - WRITE  (POST / PUT / PATCH)          → 30 req/min per user
 * - DELETE (DELETE)                       → 10 req/min per user
 * - READ   (GET)                          → 100 req/min per user
 * <p>
 * Keying: username from JWT when available, falls back to client IP.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${jwt.secret}")
    private String jwtSecret;

    private SecretKey signingKey;

    // --- Rate limit constants ---

    private static final int LOGIN_LIMIT = 10;
    private static final int AUTH_LIMIT = 30;
    private static final int CHAT_LIMIT = 5;
    private static final int WRITE_LIMIT = 30;
    private static final int DELETE_LIMIT = 10;
    private static final int READ_LIMIT = 100;

    private static final Duration WINDOW = Duration.ofMinutes(1);

    // --- Endpoint type classification ---

    private enum EndpointType {
        LOGIN,    // POST /api/auth/login
        AUTH,     // GET /api/auth/me
        CHAT,     // POST /api/chat
        WRITE,    // POST / PUT / PATCH
        DELETE,   // DELETE
        READ,     // GET
        SKIP      // non-API / preflight
    }

    @PostConstruct
    public void init() {
        if (jwtSecret != null && jwtSecret.length() >= 32) {
            try {
                byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
                this.signingKey = Keys.hmacShaKeyFor(keyBytes);
            } catch (Exception e) {
                this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            }
        } else {
            log.warn("JWT secret not configured or too short — falling back to IP-only keying for all endpoints");
            this.signingKey = null;
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        // Skip non-API paths and preflight
        if (!path.startsWith("/api/") || "OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        EndpointType type = classify(path, method);
        if (type == EndpointType.SKIP) {
            chain.doFilter(request, response);
            return;
        }

        String key = resolveKey(httpRequest, type);
        Bucket bucket = buckets.computeIfAbsent(key, k -> createBucket(type));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            log.debug("Rate limit exceeded for key={}, type={}, path={}", key, type, path);
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write(
                    "{\"error\":\"Too many requests. Please try again later.\"}"
            );
        }
    }

    // -----------------------------------------------------------------------
    // Classification
    // -----------------------------------------------------------------------

    private static EndpointType classify(String path, String method) {
        // Login endpoint — always IP-keyed
        if ("/api/auth/login".equals(path) && "POST".equalsIgnoreCase(method)) {
            return EndpointType.LOGIN;
        }

        // Auth read endpoints
        if (path.startsWith("/api/auth/") && "GET".equalsIgnoreCase(method)) {
            return EndpointType.AUTH;
        }

        // Chat — expensive AI call, tightest limit
        if ("/api/chat".equals(path) || path.startsWith("/api/chat/")) {
            return EndpointType.CHAT;
        }

        // DELETE — destructive operations
        if ("DELETE".equalsIgnoreCase(method)) {
            return EndpointType.DELETE;
        }

        // WRITE — modifications
        if (isWriteMethod(method)) {
            return EndpointType.WRITE;
        }

        // READ — everything else with GET
        if ("GET".equalsIgnoreCase(method)) {
            return EndpointType.READ;
        }

        // HEAD, TRACE, etc. — skip
        return EndpointType.SKIP;
    }

    private static boolean isWriteMethod(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method);
    }

    // -----------------------------------------------------------------------
    // Key resolution: user (from JWT) → IP fallback
    // -----------------------------------------------------------------------

    private String resolveKey(HttpServletRequest request, EndpointType type) {
        // Login is always IP-keyed (no JWT to parse)
        if (type == EndpointType.LOGIN) {
            return "ip:" + request.getRemoteAddr();
        }

        // For authenticated endpoints, try to extract username from JWT
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ") && signingKey != null) {
            try {
                String token = authHeader.substring(7);
                Claims claims = Jwts.parser()
                        .verifyWith(signingKey)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
                String username = claims.getSubject();
                if (username != null && !username.isBlank()) {
                    return "user:" + username;
                }
            } catch (Exception e) {
                log.debug("Failed to parse JWT for rate limit keying: {}", e.getMessage());
            }
        }

        return "ip:" + request.getRemoteAddr();
    }

    // -----------------------------------------------------------------------
    // Bucket factory
    // -----------------------------------------------------------------------

    private static Bucket createBucket(EndpointType type) {
        Bandwidth limit = switch (type) {
            case LOGIN  -> Bandwidth.classic(LOGIN_LIMIT, Refill.greedy(LOGIN_LIMIT, WINDOW));
            case AUTH   -> Bandwidth.classic(AUTH_LIMIT, Refill.greedy(AUTH_LIMIT, WINDOW));
            case CHAT   -> Bandwidth.classic(CHAT_LIMIT, Refill.greedy(CHAT_LIMIT, WINDOW));
            case WRITE  -> Bandwidth.classic(WRITE_LIMIT, Refill.greedy(WRITE_LIMIT, WINDOW));
            case DELETE -> Bandwidth.classic(DELETE_LIMIT, Refill.greedy(DELETE_LIMIT, WINDOW));
            case READ   -> Bandwidth.classic(READ_LIMIT, Refill.greedy(READ_LIMIT, WINDOW));
            default     -> Bandwidth.classic(READ_LIMIT, Refill.greedy(READ_LIMIT, WINDOW));
        };
        return Bucket4j.builder().addLimit(limit).build();
    }
}
