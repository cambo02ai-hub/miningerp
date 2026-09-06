package com.jpmonitor.domains.core.service;

import com.jpmonitor.domains.core.entity.User;
import com.jpmonitor.domains.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(CustomUserDetailsService.class);
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.isBlank()) {
            throw new UsernameNotFoundException("Username cannot be empty");
        }
        String cleanUsername = username.trim();
        User user = userRepository.findByUsernameIgnoreCase(cleanUsername)
                .or(() -> userRepository.findByUsername(cleanUsername))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        String roleCode = user.getRole().getCode();
        log.debug("Loaded user: {} with role: {}", user.getUsername(), roleCode);

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                user.getIsActive() != null && user.getIsActive(),
                true, true, true,
                Collections.singletonList(new SimpleGrantedAuthority(roleCode)));
    }
}
