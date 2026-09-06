package com.jpmonitor.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jpmonitor.api.controller.AuthController;
import com.jpmonitor.domains.core.dto.LoginRequest;
import com.jpmonitor.domains.core.dto.RegisterRequest;
import com.jpmonitor.domains.core.dto.UserDTO;
import com.jpmonitor.domains.core.entity.Role;
import com.jpmonitor.domains.core.entity.User;
import com.jpmonitor.domains.core.repository.RoleRepository;
import com.jpmonitor.domains.core.repository.UserRepository;
import com.jpmonitor.platform.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Auth Controller Tests")
class AuthControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserDetailsService userDetailsService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthController authController;

    private User testUser;
    private Role testRole;
    private static final String TEST_TOKEN = "eyJhbGciOiJIUzI1NiJ9.test-token";
    private static final String TEST_USERNAME = "admin";
    private static final String TEST_PASSWORD = "admin123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController).build();

        testRole = new Role();
        testRole.setId(UUID.randomUUID());
        testRole.setCode("ADMIN");
        testRole.setName("Administrator");
        testRole.setPermissions("[\"*\"]");

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername(TEST_USERNAME);
        testUser.setEmail("admin@jpmonitor.com");
        testUser.setFullName("Admin User");
        testUser.setPasswordHash("hash");
        testUser.setRole(testRole);
        testUser.setIsActive(true);
    }

    @Test
    @DisplayName("POST /api/auth/login with valid credentials returns JWT token and user info")
    void testLoginWithValidCredentials() throws Exception {
        // Given
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getPassword()).thenReturn("hash");

        when(userDetailsService.loadUserByUsername(TEST_USERNAME)).thenReturn(userDetails);
        when(passwordEncoder.matches(TEST_PASSWORD, "hash")).thenReturn(true);
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(testUser));
        when(jwtUtils.generateToken(userDetails)).thenReturn(TEST_TOKEN);

        LoginRequest loginRequest = new LoginRequest(TEST_USERNAME, TEST_PASSWORD);

        // When/Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(TEST_TOKEN))
                .andExpect(jsonPath("$.user.username").value(TEST_USERNAME))
                .andExpect(jsonPath("$.user.email").value("admin@jpmonitor.com"))
                .andExpect(jsonPath("$.user.fullName").value("Admin User"))
                .andExpect(jsonPath("$.user.role").value("Administrator"));

        verify(userDetailsService).loadUserByUsername(TEST_USERNAME);
        verify(passwordEncoder).matches(TEST_PASSWORD, "hash");
        verify(userRepository).findByUsername(TEST_USERNAME);
        verify(jwtUtils).generateToken(userDetails);
    }

    @Test
    @DisplayName("POST /api/auth/login with invalid credentials returns 401")
    void testLoginWithInvalidCredentials() throws Exception {
        // Given
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getPassword()).thenReturn("hash");
        when(userDetailsService.loadUserByUsername("wronguser")).thenReturn(userDetails);
        when(passwordEncoder.matches("wrongpass", "hash")).thenReturn(false);

        LoginRequest loginRequest = new LoginRequest("wronguser", "wrongpass");

        // When/Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));

        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("POST /api/auth/register with valid input creates user successfully")
    void testRegisterWithValidInput() throws Exception {
        // Given
        RegisterRequest registerRequest = new RegisterRequest(
                "newuser",
                "password123",
                "New User",
                "newuser@jpmonitor.com",
                "EMP-001",
                "Mining Operations",
                "Satui Mine",
                "OPERATOR",
                "ACTIVE",
                List.of("daily_logs.read", "daily_logs.write")
        );

        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(roleRepository.findByCode("OPERATOR")).thenReturn(Optional.of(testRole));
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword123");

        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());
        savedUser.setUsername("newuser");
        savedUser.setEmail("newuser@jpmonitor.com");
        savedUser.setFullName("New User");
        savedUser.setPasswordHash("encodedPassword123");
        savedUser.setRole(testRole);
        savedUser.setIsActive(true);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // When/Then
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.email").value("newuser@jpmonitor.com"))
                .andExpect(jsonPath("$.fullName").value("New User"));

        verify(userRepository).findByUsername("newuser");
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("POST /api/auth/register with duplicate username returns 400 Bad Request")
    void testRegisterWithDuplicateUsername() throws Exception {
        // Given
        RegisterRequest registerRequest = new RegisterRequest(
                TEST_USERNAME,
                "password123",
                "Existing User",
                "existing@jpmonitor.com",
                "", "", "", "OPERATOR", "ACTIVE", List.of()
        );

        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(testUser));

        // When/Then
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is already taken"));

        verify(userRepository).findByUsername(TEST_USERNAME);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("GET /api/auth/me with valid token returns current user info")
    void testGetCurrentUserWithValidToken() throws Exception {
        // Given
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn(TEST_USERNAME);

        when(userRepository.findByUsername(TEST_USERNAME))
                .thenReturn(Optional.of(testUser));

        mockMvc.perform(get("/api/auth/me")
                        .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(TEST_USERNAME))
                .andExpect(jsonPath("$.email").value("admin@jpmonitor.com"))
                .andExpect(jsonPath("$.fullName").value("Admin User"))
                .andExpect(jsonPath("$.role").value("Administrator"));

        verify(userRepository).findByUsername(TEST_USERNAME);
    }
}
